import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArticleView } from '../article-views/entities/article-view.entity';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { Category } from '../categories/entities/category.entity';
import { Comment } from '../comments/entities/comment.entity';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { VipTransaction } from '../transactions/entities/vip-transaction.entity';
import { TransactionStatus } from '../transactions/enums/transaction-status.enum';
import { User } from '../users/entities/user.entity';
import { VipPackage } from '../vip-packages/entities/vip-package.entity';

import {
    AdminOverviewQueryDto,
    AdminTopQueryDto,
    ArticleStatsQueryDto,
    AuthorStatsQueryDto,
} from './dto';
import { StatsGranularity } from './enums/stats-granularity.enum';
import { StatsSortDirection } from './enums/stats-sort-direction.enum';
import { StatsSortField } from './enums/stats-sort-field.enum';
import { StatsTargetType } from './enums/stats-target-type.enum';

export interface DateRange {
    start: Date;
    end: Date;
}

export interface TimelineItem {
    period: string;
    views: number;
    comments: number;
    revenue: number;
}

@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(Article)
        private readonly articleRepository: Repository<Article>,

        @InjectRepository(ArticleView)
        private readonly articleViewRepository: Repository<ArticleView>,

        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,

        @InjectRepository(VipPackage)
        private readonly vipPackageRepository: Repository<VipPackage>,

        @InjectRepository(VipTransaction)
        private readonly transactionRepository: Repository<VipTransaction>,
    ) { }

    async getArticleStats(
        dto: ArticleStatsQueryDto,
        currentUser: AuthenticatedUser,
    ) {
        const article =
            await this.findArticleWithRelations(
                dto.articleId,
            );

        this.ensureCanViewArticleStats(
            article,
            currentUser,
        );

        const range = this.resolveDateRange(
            dto.startDate,
            dto.endDate,
        );

        const viewBucket =
            this.getBucketExpression(
                'view.viewed_at',
                dto.granularity,
            );

        const commentBucket =
            this.getBucketExpression(
                'comment.created_at',
                dto.granularity,
            );

        const [
            viewSummary,
            commentSummary,
            viewTimeline,
            commentTimeline,
        ] = await Promise.all([
            this.articleViewRepository
                .createQueryBuilder('view')
                .select(
                    'COUNT(view.id)',
                    'totalViews',
                )
                .addSelect(
                    `
          COUNT(
            DISTINCT CASE
              WHEN view.user_id IS NOT NULL
                THEN CONCAT('USER-', view.user_id)
              ELSE CONCAT('READER-', view.reader_key)
            END
          )
          `,
                    'uniqueReaders',
                )
                .where(
                    'view.article_id = :articleId',
                    {
                        articleId: article.id,
                    },
                )
                .andWhere(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                )
                .getRawOne<{
                    totalViews: string;
                    uniqueReaders: string;
                }>(),

            this.commentRepository
                .createQueryBuilder('comment')
                .select(
                    'COUNT(comment.id)',
                    'totalComments',
                )
                .where(
                    'comment.article_id = :articleId',
                    {
                        articleId: article.id,
                    },
                )
                .andWhere(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                )
                .getRawOne<{
                    totalComments: string;
                }>(),

            this.articleViewRepository
                .createQueryBuilder('view')
                .select(viewBucket, 'period')
                .addSelect(
                    'COUNT(view.id)',
                    'views',
                )
                .where(
                    'view.article_id = :articleId',
                    {
                        articleId: article.id,
                    },
                )
                .andWhere(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                )
                .groupBy(viewBucket)
                .orderBy(viewBucket, 'ASC')
                .getRawMany<{
                    period: string;
                    views: string;
                }>(),

            this.commentRepository
                .createQueryBuilder('comment')
                .select(commentBucket, 'period')
                .addSelect(
                    'COUNT(comment.id)',
                    'comments',
                )
                .where(
                    'comment.article_id = :articleId',
                    {
                        articleId: article.id,
                    },
                )
                .andWhere(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                )
                .groupBy(commentBucket)
                .orderBy(commentBucket, 'ASC')
                .getRawMany<{
                    period: string;
                    comments: string;
                }>(),
        ]);

        return {
            message:
                'Lấy thống kê bài viết thành công',

            data: {
                article: {
                    id: article.id,
                    title: article.title,
                    status: article.status,
                    type: article.type,
                    author: {
                        id: article.author.id,
                        name: article.author.name,
                    },
                    category: {
                        id: article.category.id,
                        name: article.category.name,
                    },
                    publishedAt:
                        article.publishedAt,
                    allTimeViewCount:
                        article.viewCount,
                },

                range: {
                    start: range.start,
                    end: range.end,
                    granularity:
                        dto.granularity,
                },

                summary: {
                    views: this.toNumber(
                        viewSummary?.totalViews,
                    ),

                    uniqueReaders:
                        this.toNumber(
                            viewSummary?.uniqueReaders,
                        ),

                    comments: this.toNumber(
                        commentSummary?.totalComments,
                    ),
                },

                timeline: this.mergeTimelines(
                    viewTimeline,
                    commentTimeline,
                ),
            },
        };
    }

    async getAuthorStats(
        dto: AuthorStatsQueryDto,
        currentUser: AuthenticatedUser,
    ) {
        const authorId =
            dto.authorId ?? currentUser.id;

        if (
            currentUser.role ===
            UserRole.AUTHOR &&
            authorId !== currentUser.id
        ) {
            throw new ForbiddenException(
                'Tác giả chỉ được xem thống kê của chính mình',
            );
        }

        const author =
            await this.userRepository.findOne({
                where: {
                    id: authorId,
                    role: UserRole.AUTHOR,
                },
            });

        if (!author) {
            throw new NotFoundException(
                'Tác giả không tồn tại',
            );
        }

        const range = this.resolveDateRange(
            dto.startDate,
            dto.endDate,
        );

        const viewBucket =
            this.getBucketExpression(
                'view.viewed_at',
                dto.groupBy,
            );

        const commentBucket =
            this.getBucketExpression(
                'comment.created_at',
                dto.groupBy,
            );

        const [
            articleSummary,
            viewSummary,
            commentSummary,
            viewTimeline,
            commentTimeline,
            topArticles,
        ] = await Promise.all([
            this.articleRepository
                .createQueryBuilder('article')
                .select(
                    'COUNT(article.id)',
                    'totalArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :approved
              THEN 1
              ELSE 0
            END
          )
          `,
                    'approvedArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :pending
              THEN 1
              ELSE 0
            END
          )
          `,
                    'pendingArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :rejected
              THEN 1
              ELSE 0
            END
          )
          `,
                    'rejectedArticles',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .setParameters({
                    approved:
                        ArticleStatus.APPROVED,
                    pending:
                        ArticleStatus.PENDING,
                    rejected:
                        ArticleStatus.REJECTED,
                })
                .getRawOne<{
                    totalArticles: string;
                    approvedArticles: string;
                    pendingArticles: string;
                    rejectedArticles: string;
                }>(),

            this.articleViewRepository
                .createQueryBuilder('view')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = view.article_id',
                )
                .select(
                    'COUNT(view.id)',
                    'totalViews',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .andWhere(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                )
                .getRawOne<{
                    totalViews: string;
                }>(),

            this.commentRepository
                .createQueryBuilder('comment')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = comment.article_id',
                )
                .select(
                    'COUNT(comment.id)',
                    'totalComments',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .andWhere(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                )
                .getRawOne<{
                    totalComments: string;
                }>(),

            this.articleViewRepository
                .createQueryBuilder('view')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = view.article_id',
                )
                .select(viewBucket, 'period')
                .addSelect(
                    'COUNT(view.id)',
                    'views',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .andWhere(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                )
                .groupBy(viewBucket)
                .orderBy(viewBucket, 'ASC')
                .getRawMany<{
                    period: string;
                    views: string;
                }>(),

            this.commentRepository
                .createQueryBuilder('comment')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = comment.article_id',
                )
                .select(commentBucket, 'period')
                .addSelect(
                    'COUNT(comment.id)',
                    'comments',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .andWhere(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                )
                .groupBy(commentBucket)
                .orderBy(commentBucket, 'ASC')
                .getRawMany<{
                    period: string;
                    comments: string;
                }>(),

            this.articleRepository
                .createQueryBuilder('article')
                .leftJoin(
                    ArticleView,
                    'view',
                    `
          view.article_id = article.id
          AND view.viewed_at BETWEEN :start AND :end
          `,
                    range,
                )
                .leftJoin(
                    Comment,
                    'comment',
                    `
          comment.article_id = article.id
          AND comment.is_visible = 1
          AND comment.created_at BETWEEN :start AND :end
          `,
                    range,
                )
                .select(
                    'article.id',
                    'id',
                )
                .addSelect(
                    'article.title',
                    'title',
                )
                .addSelect(
                    'article.status',
                    'status',
                )
                .addSelect(
                    'COUNT(DISTINCT view.id)',
                    'views',
                )
                .addSelect(
                    'COUNT(DISTINCT comment.id)',
                    'comments',
                )
                .where(
                    'article.author_id = :authorId',
                    {
                        authorId,
                    },
                )
                .groupBy('article.id')
                .addGroupBy('article.title')
                .addGroupBy('article.status')
                .orderBy('views', 'DESC')
                .addOrderBy('comments', 'DESC')
                .limit(5)
                .getRawMany<{
                    id: string;
                    title: string;
                    status: ArticleStatus;
                    views: string;
                    comments: string;
                }>(),
        ]);

        return {
            message:
                'Lấy thống kê tác giả thành công',

            data: {
                author: {
                    id: author.id,
                    name: author.name,
                    email: author.email,
                },

                range: {
                    start: range.start,
                    end: range.end,
                    groupBy: dto.groupBy,
                },

                summary: {
                    totalArticles:
                        this.toNumber(
                            articleSummary?.totalArticles,
                        ),

                    approvedArticles:
                        this.toNumber(
                            articleSummary?.approvedArticles,
                        ),

                    pendingArticles:
                        this.toNumber(
                            articleSummary?.pendingArticles,
                        ),

                    rejectedArticles:
                        this.toNumber(
                            articleSummary?.rejectedArticles,
                        ),

                    views: this.toNumber(
                        viewSummary?.totalViews,
                    ),

                    comments: this.toNumber(
                        commentSummary?.totalComments,
                    ),
                },

                timeline: this.mergeTimelines(
                    viewTimeline,
                    commentTimeline,
                ),

                topArticles: topArticles.map(
                    (item) => ({
                        id: this.toNumber(item.id),
                        title: item.title,
                        status: item.status,
                        views: this.toNumber(
                            item.views,
                        ),
                        comments: this.toNumber(
                            item.comments,
                        ),
                    }),
                ),
            },
        };
    }

    async getAdminOverview(
        dto: AdminOverviewQueryDto,
    ) {
        const range = this.resolveDateRange(
            dto.startDate,
            dto.endDate,
        );

        const viewBucket =
            this.getBucketExpression(
                'view.viewed_at',
                dto.groupBy,
            );

        const commentBucket =
            this.getBucketExpression(
                'comment.created_at',
                dto.groupBy,
            );

        const transactionBucket =
            this.getBucketExpression(
                'transaction.paid_at',
                dto.groupBy,
            );

        const articleQuery =
            this.articleRepository
                .createQueryBuilder('article');

        this.applyArticleFilters(
            articleQuery,
            dto.authorId,
            dto.categoryId,
        );

        const viewQuery =
            this.articleViewRepository
                .createQueryBuilder('view')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = view.article_id',
                )
                .where(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                );

        this.applyArticleFilters(
            viewQuery,
            dto.authorId,
            dto.categoryId,
        );

        const commentQuery =
            this.commentRepository
                .createQueryBuilder('comment')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = comment.article_id',
                )
                .where(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                );

        this.applyArticleFilters(
            commentQuery,
            dto.authorId,
            dto.categoryId,
        );

        const viewTimelineQuery =
            this.articleViewRepository
                .createQueryBuilder('view')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = view.article_id',
                )
                .select(viewBucket, 'period')
                .addSelect(
                    'COUNT(view.id)',
                    'views',
                )
                .where(
                    'view.viewed_at BETWEEN :start AND :end',
                    range,
                );

        this.applyArticleFilters(
            viewTimelineQuery,
            dto.authorId,
            dto.categoryId,
        );

        const commentTimelineQuery =
            this.commentRepository
                .createQueryBuilder('comment')
                .innerJoin(
                    Article,
                    'article',
                    'article.id = comment.article_id',
                )
                .select(commentBucket, 'period')
                .addSelect(
                    'COUNT(comment.id)',
                    'comments',
                )
                .where(
                    'comment.is_visible = :visible',
                    {
                        visible: true,
                    },
                )
                .andWhere(
                    'comment.created_at BETWEEN :start AND :end',
                    range,
                );

        this.applyArticleFilters(
            commentTimelineQuery,
            dto.authorId,
            dto.categoryId,
        );

        const [
            userSummary,
            articleSummary,
            viewSummary,
            commentSummary,
            commerceSummary,
            viewTimeline,
            commentTimeline,
            revenueTimeline,
        ] = await Promise.all([
            this.userRepository
                .createQueryBuilder('user')
                .select(
                    'COUNT(user.id)',
                    'totalUsers',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN user.status = 'ACTIVE'
              THEN 1
              ELSE 0
            END
          )
          `,
                    'activeUsers',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN user.role = :authorRole
              THEN 1
              ELSE 0
            END
          )
          `,
                    'authors',
                )
                .setParameter(
                    'authorRole',
                    UserRole.AUTHOR,
                )
                .getRawOne<{
                    totalUsers: string;
                    activeUsers: string;
                    authors: string;
                }>(),

            articleQuery
                .select(
                    'COUNT(article.id)',
                    'totalArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :approved
              THEN 1
              ELSE 0
            END
          )
          `,
                    'approvedArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :pending
              THEN 1
              ELSE 0
            END
          )
          `,
                    'pendingArticles',
                )
                .addSelect(
                    `
          SUM(
            CASE
              WHEN article.status = :rejected
              THEN 1
              ELSE 0
            END
          )
          `,
                    'rejectedArticles',
                )
                .setParameters({
                    approved:
                        ArticleStatus.APPROVED,
                    pending:
                        ArticleStatus.PENDING,
                    rejected:
                        ArticleStatus.REJECTED,
                })
                .getRawOne<{
                    totalArticles: string;
                    approvedArticles: string;
                    pendingArticles: string;
                    rejectedArticles: string;
                }>(),

            viewQuery
                .select(
                    'COUNT(view.id)',
                    'totalViews',
                )
                .getRawOne<{
                    totalViews: string;
                }>(),

            commentQuery
                .select(
                    'COUNT(comment.id)',
                    'totalComments',
                )
                .getRawOne<{
                    totalComments: string;
                }>(),

            this.transactionRepository
                .createQueryBuilder('transaction')
                .select(
                    'COUNT(transaction.id)',
                    'successfulTransactions',
                )
                .addSelect(
                    'COALESCE(SUM(transaction.amount), 0)',
                    'revenue',
                )
                .where(
                    'transaction.status = :status',
                    {
                        status:
                            TransactionStatus.SUCCESS,
                    },
                )
                .andWhere(
                    'transaction.paid_at BETWEEN :start AND :end',
                    range,
                )
                .getRawOne<{
                    successfulTransactions: string;
                    revenue: string;
                }>(),

            viewTimelineQuery
                .groupBy(viewBucket)
                .orderBy(viewBucket, 'ASC')
                .getRawMany<{
                    period: string;
                    views: string;
                }>(),

            commentTimelineQuery
                .groupBy(commentBucket)
                .orderBy(
                    commentBucket,
                    'ASC',
                )
                .getRawMany<{
                    period: string;
                    comments: string;
                }>(),

            this.transactionRepository
                .createQueryBuilder(
                    'transaction',
                )
                .select(
                    transactionBucket,
                    'period',
                )
                .addSelect(
                    `
          COALESCE(
            SUM(transaction.amount),
            0
          )
          `,
                    'revenue',
                )
                .where(
                    'transaction.status = :status',
                    {
                        status:
                            TransactionStatus.SUCCESS,
                    },
                )
                .andWhere(
                    'transaction.paid_at BETWEEN :start AND :end',
                    range,
                )
                .groupBy(transactionBucket)
                .orderBy(
                    transactionBucket,
                    'ASC',
                )
                .getRawMany<{
                    period: string;
                    revenue: string;
                }>(),
        ]);

        return {
            message:
                'Lấy thống kê tổng quan thành công',

            data: {
                range: {
                    start: range.start,
                    end: range.end,
                    groupBy: dto.groupBy,
                },

                filters: {
                    authorId:
                        dto.authorId ?? null,
                    categoryId:
                        dto.categoryId ?? null,

                    note:
                        'Bộ lọc tác giả và danh mục áp dụng cho bài viết, lượt xem và bình luận. Doanh thu VIP là doanh thu toàn hệ thống.',
                },

                users: {
                    total:
                        this.toNumber(
                            userSummary?.totalUsers,
                        ),

                    active:
                        this.toNumber(
                            userSummary?.activeUsers,
                        ),

                    authors:
                        this.toNumber(
                            userSummary?.authors,
                        ),
                },

                articles: {
                    total:
                        this.toNumber(
                            articleSummary?.totalArticles,
                        ),

                    approved:
                        this.toNumber(
                            articleSummary?.approvedArticles,
                        ),

                    pending:
                        this.toNumber(
                            articleSummary?.pendingArticles,
                        ),

                    rejected:
                        this.toNumber(
                            articleSummary?.rejectedArticles,
                        ),
                },

                engagement: {
                    views:
                        this.toNumber(
                            viewSummary?.totalViews,
                        ),

                    comments:
                        this.toNumber(
                            commentSummary?.totalComments,
                        ),
                },

                commerce: {
                    successfulTransactions:
                        this.toNumber(
                            commerceSummary
                                ?.successfulTransactions,
                        ),

                    revenue:
                        this.toNumber(
                            commerceSummary?.revenue,
                        ),
                },

                timeline: this.mergeTimelines(
                    viewTimeline,
                    commentTimeline,
                    revenueTimeline,
                ),
            },
        };
    }

    async getAdminTop(
        dto: AdminTopQueryDto,
    ) {
        const range = this.resolveDateRange(
            dto.startDate,
            dto.endDate,
        );

        this.validateTopSortCombination(
            dto.targetType,
            dto.sortBy,
        );

        let data: unknown[];

        switch (dto.targetType) {
            case StatsTargetType.AUTHOR:
                data = await this.getTopAuthors(
                    dto,
                    range,
                );
                break;

            case StatsTargetType.ARTICLE:
                data = await this.getTopArticles(
                    dto,
                    range,
                );
                break;

            case StatsTargetType.CATEGORY:
                data = await this.getTopCategories(
                    dto,
                    range,
                );
                break;

            case StatsTargetType.VIP_PACKAGE:
                data =
                    await this.getTopVipPackages(
                        dto,
                        range,
                    );
                break;

            default:
                throw new BadRequestException(
                    'Đối tượng thống kê không hợp lệ',
                );
        }

        return {
            message:
                'Lấy bảng xếp hạng thành công',

            data: {
                targetType: dto.targetType,
                sortBy: dto.sortBy,
                sortDirection:
                    dto.sortDirection,
                range,
                items: data,
            },
        };
    }

    async getAdminAuthors() {
        const authors =
            await this.userRepository
                .createQueryBuilder('user')
                .leftJoin(
                    Article,
                    'article',
                    'article.author_id = user.id',
                )
                .select('user.id', 'id')
                .addSelect('user.name', 'name')
                .addSelect('user.email', 'email')
                .addSelect(
                    'COUNT(article.id)',
                    'articleCount',
                )
                .where(
                    'user.role = :role',
                    {
                        role: UserRole.AUTHOR,
                    },
                )
                .groupBy('user.id')
                .addGroupBy('user.name')
                .addGroupBy('user.email')
                .orderBy('user.name', 'ASC')
                .getRawMany<{
                    id: string;
                    name: string;
                    email: string;
                    articleCount: string;
                }>();

        return {
            message:
                'Lấy danh sách tác giả thành công',

            data: authors.map(
                (author) => ({
                    id: this.toNumber(author.id),
                    name: author.name,
                    email: author.email,
                    articleCount:
                        this.toNumber(
                            author.articleCount,
                        ),
                }),
            ),
        };
    }

    private async getTopAuthors(
        dto: AdminTopQueryDto,
        range: DateRange,
    ) {
        const orderAlias =
            dto.sortBy ===
                StatsSortField.ARTICLES
                ? 'articles'
                : dto.sortBy;

        const rows =
            await this.userRepository
                .createQueryBuilder('user')
                .leftJoin(
                    Article,
                    'article',
                    'article.author_id = user.id',
                )
                .leftJoin(
                    ArticleView,
                    'view',
                    `
          view.article_id = article.id
          AND view.viewed_at BETWEEN :start AND :end
          `,
                    range,
                )
                .leftJoin(
                    Comment,
                    'comment',
                    `
          comment.article_id = article.id
          AND comment.is_visible = 1
          AND comment.created_at BETWEEN :start AND :end
          `,
                    range,
                )
                .select('user.id', 'id')
                .addSelect('user.name', 'name')
                .addSelect(
                    'COUNT(DISTINCT article.id)',
                    'articles',
                )
                .addSelect(
                    'COUNT(DISTINCT view.id)',
                    'views',
                )
                .addSelect(
                    'COUNT(DISTINCT comment.id)',
                    'comments',
                )
                .where(
                    'user.role = :role',
                    {
                        role: UserRole.AUTHOR,
                    },
                )
                .groupBy('user.id')
                .addGroupBy('user.name')
                .orderBy(
                    orderAlias,
                    this.getOrderDirection(
                        dto.sortDirection,
                    ),
                )
                .limit(dto.limit)
                .getRawMany<{
                    id: string;
                    name: string;
                    articles: string;
                    views: string;
                    comments: string;
                }>();

        return rows.map((item) => ({
            id: this.toNumber(item.id),
            name: item.name,
            articles:
                this.toNumber(item.articles),
            views: this.toNumber(item.views),
            comments:
                this.toNumber(item.comments),
        }));
    }

    private async getTopArticles(
        dto: AdminTopQueryDto,
        range: DateRange,
    ) {
        const rows =
            await this.articleRepository
                .createQueryBuilder('article')
                .leftJoin(
                    User,
                    'author',
                    'author.id = article.author_id',
                )
                .leftJoin(
                    Category,
                    'category',
                    'category.id = article.category_id',
                )
                .leftJoin(
                    ArticleView,
                    'view',
                    `
          view.article_id = article.id
          AND view.viewed_at BETWEEN :start AND :end
          `,
                    range,
                )
                .leftJoin(
                    Comment,
                    'comment',
                    `
          comment.article_id = article.id
          AND comment.is_visible = 1
          AND comment.created_at BETWEEN :start AND :end
          `,
                    range,
                )
                .select('article.id', 'id')
                .addSelect(
                    'article.title',
                    'title',
                )
                .addSelect(
                    'author.name',
                    'authorName',
                )
                .addSelect(
                    'category.name',
                    'categoryName',
                )
                .addSelect(
                    'COUNT(DISTINCT view.id)',
                    'views',
                )
                .addSelect(
                    'COUNT(DISTINCT comment.id)',
                    'comments',
                )
                .where(
                    'article.status = :status',
                    {
                        status:
                            ArticleStatus.APPROVED,
                    },
                )
                .groupBy('article.id')
                .addGroupBy('article.title')
                .addGroupBy('author.name')
                .addGroupBy('category.name')
                .orderBy(
                    dto.sortBy,
                    this.getOrderDirection(
                        dto.sortDirection,
                    ),
                )
                .limit(dto.limit)
                .getRawMany<{
                    id: string;
                    title: string;
                    authorName: string;
                    categoryName: string;
                    views: string;
                    comments: string;
                }>();

        return rows.map((item) => ({
            id: this.toNumber(item.id),
            title: item.title,
            authorName: item.authorName,
            categoryName:
                item.categoryName,
            views: this.toNumber(item.views),
            comments:
                this.toNumber(item.comments),
        }));
    }

    private async getTopCategories(
        dto: AdminTopQueryDto,
        range: DateRange,
    ) {
        const orderAlias =
            dto.sortBy ===
                StatsSortField.ARTICLES
                ? 'articles'
                : dto.sortBy;

        const rows =
            await this.categoryRepository
                .createQueryBuilder('category')
                .leftJoin(
                    Article,
                    'article',
                    'article.category_id = category.id',
                )
                .leftJoin(
                    ArticleView,
                    'view',
                    `
          view.article_id = article.id
          AND view.viewed_at BETWEEN :start AND :end
          `,
                    range,
                )
                .leftJoin(
                    Comment,
                    'comment',
                    `
          comment.article_id = article.id
          AND comment.is_visible = 1
          AND comment.created_at BETWEEN :start AND :end
          `,
                    range,
                )
                .select(
                    'category.id',
                    'id',
                )
                .addSelect(
                    'category.name',
                    'name',
                )
                .addSelect(
                    'COUNT(DISTINCT article.id)',
                    'articles',
                )
                .addSelect(
                    'COUNT(DISTINCT view.id)',
                    'views',
                )
                .addSelect(
                    'COUNT(DISTINCT comment.id)',
                    'comments',
                )
                .groupBy('category.id')
                .addGroupBy('category.name')
                .orderBy(
                    orderAlias,
                    this.getOrderDirection(
                        dto.sortDirection,
                    ),
                )
                .limit(dto.limit)
                .getRawMany<{
                    id: string;
                    name: string;
                    articles: string;
                    views: string;
                    comments: string;
                }>();

        return rows.map((item) => ({
            id: this.toNumber(item.id),
            name: item.name,
            articles:
                this.toNumber(item.articles),
            views: this.toNumber(item.views),
            comments:
                this.toNumber(item.comments),
        }));
    }

    private async getTopVipPackages(
        dto: AdminTopQueryDto,
        range: DateRange,
    ) {
        const rows =
            await this.vipPackageRepository
                .createQueryBuilder('vipPackage')
                .leftJoin(
                    VipTransaction,
                    'transaction',
                    `
          transaction.package_id = vipPackage.id
          AND transaction.status = :status
          AND transaction.paid_at BETWEEN :start AND :end
          `,
                    {
                        ...range,
                        status:
                            TransactionStatus.SUCCESS,
                    },
                )
                .select(
                    'vipPackage.id',
                    'id',
                )
                .addSelect(
                    'vipPackage.name',
                    'name',
                )
                .addSelect(
                    'COUNT(DISTINCT transaction.id)',
                    'transactions',
                )
                .addSelect(
                    `
          COALESCE(
            SUM(transaction.amount),
            0
          )
          `,
                    'revenue',
                )
                .groupBy('vipPackage.id')
                .addGroupBy('vipPackage.name')
                .orderBy(
                    dto.sortBy,
                    this.getOrderDirection(
                        dto.sortDirection,
                    ),
                )
                .limit(dto.limit)
                .getRawMany<{
                    id: string;
                    name: string;
                    transactions: string;
                    revenue: string;
                }>();

        return rows.map((item) => ({
            id: this.toNumber(item.id),
            name: item.name,
            transactions:
                this.toNumber(
                    item.transactions,
                ),
            revenue:
                this.toNumber(item.revenue),
        }));
    }

    private validateTopSortCombination(
        targetType: StatsTargetType,
        sortBy: StatsSortField,
    ): void {
        const allowedFields: Record<
            StatsTargetType,
            StatsSortField[]
        > = {
            [StatsTargetType.AUTHOR]: [
                StatsSortField.VIEWS,
                StatsSortField.COMMENTS,
                StatsSortField.ARTICLES,
            ],

            [StatsTargetType.ARTICLE]: [
                StatsSortField.VIEWS,
                StatsSortField.COMMENTS,
            ],

            [StatsTargetType.CATEGORY]: [
                StatsSortField.VIEWS,
                StatsSortField.COMMENTS,
                StatsSortField.ARTICLES,
            ],

            [StatsTargetType.VIP_PACKAGE]: [
                StatsSortField.REVENUE,
                StatsSortField.TRANSACTIONS,
            ],
        };

        if (
            !allowedFields[targetType].includes(
                sortBy,
            )
        ) {
            throw new BadRequestException(
                `Không thể sắp xếp ${targetType} theo ${sortBy}`,
            );
        }
    }

    private applyArticleFilters(
        queryBuilder: any,
        authorId?: number,
        categoryId?: number,
    ): void {
        if (authorId) {
            queryBuilder.andWhere(
                'article.author_id = :authorId',
                {
                    authorId,
                },
            );
        }

        if (categoryId) {
            queryBuilder.andWhere(
                'article.category_id = :categoryId',
                {
                    categoryId,
                },
            );
        }
    }

    private async findArticleWithRelations(
        articleId: number,
    ): Promise<Article> {
        const article =
            await this.articleRepository.findOne({
                where: {
                    id: articleId,
                },
                relations: {
                    author: true,
                    category: true,
                },
            });

        if (!article) {
            throw new NotFoundException(
                'Bài viết không tồn tại',
            );
        }

        return article;
    }

    private ensureCanViewArticleStats(
        article: Article,
        user: AuthenticatedUser,
    ): void {
        if (user.role === UserRole.ADMIN) {
            return;
        }

        if (
            user.role === UserRole.AUTHOR &&
            article.authorId === user.id
        ) {
            return;
        }

        throw new ForbiddenException(
            'Bạn không có quyền xem thống kê bài viết này',
        );
    }

    private resolveDateRange(
        startDate?: string,
        endDate?: string,
    ): DateRange {
        const end = endDate
            ? this.parseDate(endDate, true)
            : new Date();

        const start = startDate
            ? this.parseDate(startDate, false)
            : new Date(
                end.getTime() -
                30 *
                24 *
                60 *
                60 *
                1000,
            );

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            throw new BadRequestException(
                'Khoảng thời gian không hợp lệ',
            );
        }

        if (start > end) {
            throw new BadRequestException(
                'startDate phải nhỏ hơn hoặc bằng endDate',
            );
        }

        return {
            start,
            end,
        };
    }

    private parseDate(
        value: string,
        endOfDay: boolean,
    ): Date {
        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                value,
            )
        ) {
            return new Date(
                `${value}T${endOfDay
                    ? '23:59:59.999'
                    : '00:00:00.000'
                }+07:00`,
            );
        }

        return new Date(value);
    }

    private getBucketExpression(
        column: string,
        granularity: StatsGranularity,
    ): string {
        switch (granularity) {
            case StatsGranularity.WEEK:
                return (
                    `DATE_FORMAT(` +
                    `${column}, '%x-W%v')`
                );

            case StatsGranularity.MONTH:
                return (
                    `DATE_FORMAT(` +
                    `${column}, '%Y-%m')`
                );

            case StatsGranularity.DAY:
            default:
                return (
                    `DATE_FORMAT(` +
                    `${column}, '%Y-%m-%d')`
                );
        }
    }

    private mergeTimelines(
        viewRows: Array<{
            period: string;
            views: string;
        }> = [],

        commentRows: Array<{
            period: string;
            comments: string;
        }> = [],

        revenueRows: Array<{
            period: string;
            revenue: string;
        }> = [],
    ): TimelineItem[] {
        const timeline =
            new Map<string, TimelineItem>();

        const getItem = (
            period: string,
        ): TimelineItem => {
            const existing =
                timeline.get(period);

            if (existing) {
                return existing;
            }

            const newItem: TimelineItem = {
                period,
                views: 0,
                comments: 0,
                revenue: 0,
            };

            timeline.set(
                period,
                newItem,
            );

            return newItem;
        };

        for (const row of viewRows) {
            getItem(row.period).views =
                this.toNumber(row.views);
        }

        for (const row of commentRows) {
            getItem(row.period).comments =
                this.toNumber(
                    row.comments,
                );
        }

        for (const row of revenueRows) {
            getItem(row.period).revenue =
                this.toNumber(row.revenue);
        }

        return [...timeline.values()].sort(
            (first, second) =>
                first.period.localeCompare(
                    second.period,
                ),
        );
    }

    private getOrderDirection(
        direction: StatsSortDirection,
    ): 'ASC' | 'DESC' {
        return direction ===
            StatsSortDirection.ASC
            ? 'ASC'
            : 'DESC';
    }

    private toNumber(
        value:
            | string
            | number
            | null
            | undefined,
    ): number {
        const result = Number(value ?? 0);

        return Number.isFinite(result)
            ? result
            : 0;
    }
}