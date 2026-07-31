import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    Brackets,
    Repository,
} from 'typeorm';

import {
    ArticleViewsService,
    RecordArticleViewInput,
} from '../article-views/article-views.service';

import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { CategoriesService } from '../categories/categories.service';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { createSlug } from '../common/utils/slug.util';

import {
    ArticleSearchQueryDto,
    CreateArticleDto,
    ModerationDecisionDto,
    StaffArticleQueryDto,
    UpdateArticleDto,
} from './dto';
import { Article } from './entities/article.entity';
import { ArticleStatus } from './enums/article-status.enum';
import { ArticleType } from './enums/article-type.enum';

@Injectable()
export class ArticlesService {
    private readonly logger =
        new Logger(
            ArticlesService.name,
        );
    constructor(
        @InjectRepository(Article)
        private readonly articleRepository: Repository<Article>,

        private readonly categoriesService: CategoriesService,

        private readonly articleViewsService: ArticleViewsService,

        private readonly cloudinaryService: CloudinaryService,
    ) { }

    async search(query: ArticleSearchQueryDto) {
        const queryBuilder =
            this.articleRepository
                .createQueryBuilder('article')
                .leftJoinAndSelect('article.author', 'author')
                .leftJoinAndSelect(
                    'article.category',
                    'category',
                )
                .where('article.status = :status', {
                    status: ArticleStatus.APPROVED,
                })
                .andWhere('article.isVisible = :isVisible', {
                    isVisible: true,
                });

        if (query.keyword?.trim()) {
            const keyword = `%${query.keyword.trim()}%`;

            queryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where(
                        'article.title LIKE :keyword',
                        {
                            keyword,
                        },
                    )
                        .orWhere(
                            'article.sapo LIKE :keyword',
                            {
                                keyword,
                            },
                        )
                        .orWhere(
                            'article.content LIKE :keyword',
                            {
                                keyword,
                            },
                        );
                }),
            );
        }

        if (query.categoryId) {
            queryBuilder.andWhere(
                'article.categoryId = :categoryId',
                {
                    categoryId: query.categoryId,
                },
            );
        }

        if (query.authorName?.trim()) {
            queryBuilder.andWhere(
                'author.name LIKE :authorName',
                {
                    authorName: `%${query.authorName.trim()}%`,
                },
            );
        }

        const articles = await queryBuilder
            .orderBy('article.publishedAt', 'DESC')
            .addOrderBy('article.id', 'DESC')
            .getMany();

        return articles.map((article) =>
            this.toListResponse(article),
        );
    }

    async preview(articleId: number) {
        const article =
            await this.findPublicArticle(articleId);

        return {
            id: article.id,
            title: article.title,
            slug: article.slug,
            coverImage: article.coverImage,
            sapo: article.sapo,
            type: article.type,
            author: {
                id: article.author.id,
                name: article.author.name,
            },
            category: {
                id: article.category.id,
                name: article.category.name,
                slug: article.category.slug,
            },
            publishedAt: article.publishedAt,
            viewCount: article.viewCount,
            contentPreview:
                article.content.length > 500
                    ? `${article.content.slice(0, 500)}...`
                    : article.content,
        };
    }

    async getPublicArticleForInteraction(
        articleId: number,
    ): Promise<Article> {
        return this.findPublicArticle(articleId);
    }

    async getAccessiblePublicArticle(
        articleId: number,
        user: AuthenticatedUser | null,
    ): Promise<Article> {
        const article =
            await this.findPublicArticle(articleId);

        if (
            article.type === ArticleType.VIP &&
            !this.canReadVipArticle(user)
        ) {
            throw new ForbiddenException(
                'Bạn cần tài khoản VIP còn hạn để sử dụng chức năng này',
            );
        }

        return article;
    }

    async read(
        articleId: number,
        user: AuthenticatedUser | null,
        viewInput: Omit<
            RecordArticleViewInput,
            'articleId' | 'userId'
        >,
    ) {
        const article =
            await this.getAccessiblePublicArticle(
                articleId,
                user,
            );

        const viewCount =
            await this.articleViewsService.recordView({
                articleId,
                userId: user?.id,
                readerKey: viewInput.readerKey,
                ipAddress: viewInput.ipAddress,
                userAgent: viewInput.userAgent,
            });

        return {
            ...this.toDetailResponse(article),
            viewCount,
        };
    }
    async getSummary(
        articleId: number,
        user: AuthenticatedUser,
    ) {
        const article =
            await this.findPublicArticle(articleId);

        if (!this.canReadVipArticle(user)) {
            throw new ForbiddenException(
                'Bạn không có quyền sử dụng chức năng này',
            );
        }

        return {
            id: article.id,
            title: article.title,
            sapo: article.sapo,
            content: article.content,
            type: article.type,
            authorName: article.author.name,
            categoryName: article.category.name,
            publishedAt: article.publishedAt,
        };
    }

    async findStaffArticles(
        user: AuthenticatedUser,
        query: StaffArticleQueryDto,
    ) {
        const queryBuilder =
            this.articleRepository
                .createQueryBuilder('article')
                .leftJoinAndSelect('article.author', 'author')
                .leftJoinAndSelect(
                    'article.category',
                    'category',
                );

        if (user.role === UserRole.AUTHOR) {
            queryBuilder.where(
                'article.authorId = :authorId',
                {
                    authorId: user.id,
                },
            );
        }

        if (query.q?.trim()) {
            const condition =
                user.role === UserRole.AUTHOR
                    ? 'andWhere'
                    : 'where';

            queryBuilder[condition](
                new Brackets((qb) => {
                    qb.where(
                        'article.title LIKE :keyword',
                        {
                            keyword: `%${query.q?.trim()}%`,
                        },
                    ).orWhere(
                        'article.sapo LIKE :keyword',
                        {
                            keyword: `%${query.q?.trim()}%`,
                        },
                    );
                }),
            );
        }

        const articles = await queryBuilder
            .orderBy('article.createdAt', 'DESC')
            .getMany();

        return articles.map((article) =>
            this.toStaffListResponse(article),
        );
    }

    async findStaffArticleDetail(
        articleId: number,
        user: AuthenticatedUser,
    ) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        this.ensureStaffCanManage(article, user);

        return this.toDetailResponse(article);
    }

    async create(
        author: AuthenticatedUser,
        dto: CreateArticleDto,
    ) {
        await this.categoriesService.findActiveById(
            dto.categoryId,
        );

        const slug = await this.createUniqueSlug(
            dto.title,
        );

        const coverImage =
            this.validateCoverImage(
                dto.coverImage,
                dto.coverImagePublicId,
                author,
            );

        const article =
            this.articleRepository.create({
                authorId: author.id,

                categoryId:
                    dto.categoryId,

                coverImage:
                    coverImage.url,

                coverImagePublicId:
                    coverImage.publicId,

                title:
                    dto.title.trim(),

                slug,

                sapo:
                    dto.sapo.trim(),

                content:
                    dto.content.trim(),

                type:
                    dto.type,

                status:
                    ArticleStatus.PENDING,

                rejectionReason:
                    null,

                isVisible:
                    false,

                viewCount:
                    0,

                publishedAt:
                    null,
            });

        const savedArticle =
            await this.articleRepository.save(article);

        return {
            message:
                'Tạo bài viết thành công, bài viết đang chờ duyệt',
            article: await this.findStaffArticleDetail(
                savedArticle.id,
                author,
            ),
        };
    }

    async update(
        articleId: number,
        user: AuthenticatedUser,
        dto: UpdateArticleDto,
    ) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        this.ensureStaffCanManage(
            article,
            user,
        );

        await this.categoriesService
            .findActiveById(dto.categoryId);

        const normalizedTitle =
            dto.title.trim();

        if (
            article.title !== normalizedTitle
        ) {
            article.slug =
                await this.createUniqueSlug(
                    normalizedTitle,
                    article.id,
                );
        }

        /*
         * Lưu publicId cũ trước khi thay đổi.
         * Sau khi database lưu thành công mới xóa ảnh cũ.
         */
        const oldCoverImagePublicId =
            article.coverImagePublicId;

        article.categoryId =
            dto.categoryId;

        article.title =
            normalizedTitle;

        article.sapo =
            dto.sapo.trim();

        article.content =
            dto.content.trim();

        article.type =
            dto.type;

        /*
         * Không cho phép vừa yêu cầu xóa ảnh,
         * vừa gửi thông tin ảnh mới.
         */
        if (
            dto.removeCoverImage === true &&
            (
                dto.coverImage !== undefined ||
                dto.coverImagePublicId !==
                undefined
            )
        ) {
            throw new BadRequestException(
                'Không thể vừa xóa vừa thay ảnh bìa',
            );
        }

        /*
         * Trường hợp xóa ảnh bìa.
         */
        if (
            dto.removeCoverImage === true
        ) {
            article.coverImage = null;
            article.coverImagePublicId = null;
        }

        /*
         * Trường hợp thay ảnh bìa.
         *
         * Phải truyền đồng thời:
         * - coverImage
         * - coverImagePublicId
         */
        else if (
            dto.coverImage !== undefined ||
            dto.coverImagePublicId !==
            undefined
        ) {
            const newCoverImage =
                this.validateCoverImage(
                    dto.coverImage,
                    dto.coverImagePublicId,
                    user,
                );

            article.coverImage =
                newCoverImage.url;

            article.coverImagePublicId =
                newCoverImage.publicId;
        }

        /*
         * Nếu không truyền các trường liên quan ảnh,
         * ảnh bìa hiện tại sẽ được giữ nguyên.
         */

        /*
         * AUTHOR sửa bài thì bài phải được duyệt lại.
         * ADMIN sửa bài thì giữ nguyên trạng thái hiện tại.
         */
        if (
            user.role === UserRole.AUTHOR
        ) {
            article.status =
                ArticleStatus.PENDING;

            article.isVisible = false;

            article.rejectionReason =
                null;

            article.publishedAt =
                null;
        }

        /*
         * Lưu database trước.
         */
        const savedArticle =
            await this.articleRepository.save(
                article,
            );

        /*
         * Chỉ xóa ảnh cũ khi:
         * - Có ảnh cũ.
         * - publicId mới khác publicId cũ.
         *
         * Điều này áp dụng cho cả:
         * - Xóa ảnh.
         * - Thay ảnh mới.
         */
        if (
            oldCoverImagePublicId &&
            oldCoverImagePublicId !==
            savedArticle.coverImagePublicId
        ) {
            try {
                await this.cloudinaryService
                    .deleteImage(
                        oldCoverImagePublicId,
                    );
            } catch (error) {
                /*
                 * Không làm thất bại toàn bộ API vì
                 * bài viết đã được cập nhật trong database.
                 *
                 * Ảnh cũ có thể được dọn dẹp bằng tác vụ sau.
                 */
                this.logger.warn(
                    `Không thể xóa ảnh Cloudinary cũ: ${oldCoverImagePublicId}`,
                    error instanceof Error
                        ? error.message
                        : String(error),
                );
            }
        }

        return {
            message:
                user.role === UserRole.AUTHOR
                    ? 'Cập nhật thành công, bài viết đang chờ duyệt lại'
                    : 'Cập nhật bài viết thành công',

            article:
                await this.findStaffArticleDetail(
                    savedArticle.id,
                    user,
                ),
        };
    }

    async findPendingArticles() {
        const articles =
            await this.articleRepository.find({
                where: {
                    status: ArticleStatus.PENDING,
                },
                relations: {
                    author: true,
                    category: true,
                },
                order: {
                    createdAt: 'ASC',
                },
            });

        return articles.map((article) =>
            this.toStaffListResponse(article),
        );
    }

    async findVisibilityArticles(
        query: StaffArticleQueryDto,
    ) {
        const queryBuilder =
            this.articleRepository
                .createQueryBuilder('article')
                .leftJoinAndSelect('article.author', 'author')
                .leftJoinAndSelect(
                    'article.category',
                    'category',
                )
                .where('article.status = :status', {
                    status: ArticleStatus.APPROVED,
                });

        if (query.q?.trim()) {
            queryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where(
                        'article.title LIKE :keyword',
                        {
                            keyword: `%${query.q?.trim()}%`,
                        },
                    ).orWhere(
                        'author.name LIKE :keyword',
                        {
                            keyword: `%${query.q?.trim()}%`,
                        },
                    );
                }),
            );
        }

        const articles = await queryBuilder
            .orderBy('article.publishedAt', 'DESC')
            .getMany();

        return articles.map((article) =>
            this.toStaffListResponse(article),
        );
    }

    async findModerationDetail(
        articleId: number,
    ) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        return this.toDetailResponse(article);
    }

    async findVisibilityDetail(
        articleId: number,
    ) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        return {
            id: article.id,
            title: article.title,
            status: article.status,
            isVisible: article.isVisible,
            author: {
                id: article.author.id,
                name: article.author.name,
            },
            category: {
                id: article.category.id,
                name: article.category.name,
            },
            publishedAt: article.publishedAt,
        };
    }

    async makeDecision(
        articleId: number,
        dto: ModerationDecisionDto,
    ) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        if (article.status !== ArticleStatus.PENDING) {
            throw new BadRequestException(
                'Chỉ có thể kiểm duyệt bài đang ở trạng thái PENDING',
            );
        }

        if (dto.approved) {
            article.status = ArticleStatus.APPROVED;
            article.rejectionReason = null;
            article.isVisible = true;
            article.publishedAt = new Date();
        } else {
            const rejectionReason =
                dto.rejectionReason?.trim();

            if (!rejectionReason) {
                throw new BadRequestException(
                    'Phải nhập lý do khi từ chối bài viết',
                );
            }

            article.status = ArticleStatus.REJECTED;
            article.rejectionReason =
                rejectionReason;
            article.isVisible = false;
            article.publishedAt = null;
        }

        await this.articleRepository.save(article);

        return {
            message: dto.approved
                ? 'Duyệt bài viết thành công'
                : 'Từ chối bài viết thành công',
            article:
                await this.findModerationDetail(
                    article.id,
                ),
        };
    }

    async hide(articleId: number) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        if (
            article.status !== ArticleStatus.APPROVED
        ) {
            throw new BadRequestException(
                'Chỉ có thể ẩn bài viết đã được duyệt',
            );
        }

        if (!article.isVisible) {
            throw new BadRequestException(
                'Bài viết đã được ẩn trước đó',
            );
        }

        article.isVisible = false;

        await this.articleRepository.save(article);

        return {
            message: 'Ẩn bài viết thành công',
            article:
                await this.findVisibilityDetail(
                    article.id,
                ),
        };
    }

    async show(articleId: number) {
        const article =
            await this.findArticleWithRelations(
                articleId,
            );

        if (
            article.status !== ArticleStatus.APPROVED
        ) {
            throw new BadRequestException(
                'Chỉ có thể hiển thị bài viết đã được duyệt',
            );
        }

        if (article.isVisible) {
            throw new BadRequestException(
                'Bài viết đang được hiển thị',
            );
        }

        article.isVisible = true;

        await this.articleRepository.save(article);

        return {
            message: 'Hiển thị bài viết thành công',
            article:
                await this.findVisibilityDetail(
                    article.id,
                ),
        };
    }

    private async findPublicArticle(
        articleId: number,
    ): Promise<Article> {
        const article =
            await this.articleRepository.findOne({
                where: {
                    id: articleId,
                    status: ArticleStatus.APPROVED,
                    isVisible: true,
                },
                relations: {
                    author: true,
                    category: true,
                },
            });

        if (!article) {
            throw new NotFoundException(
                'Bài viết không tồn tại hoặc chưa được công khai',
            );
        }

        return article;
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

    private ensureStaffCanManage(
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
            'Bạn không có quyền quản lý bài viết này',
        );
    }

    private canReadVipArticle(
        user: AuthenticatedUser | null,
    ): boolean {
        if (!user) {
            return false;
        }

        if (user.role === UserRole.ADMIN) {
            return true;
        }

        return (
            user.vipExpiredAt !== null &&
            new Date(user.vipExpiredAt).getTime() >
            Date.now()
        );
    }

    private async createUniqueSlug(
        title: string,
        ignoredArticleId?: number,
    ): Promise<string> {
        const baseSlug =
            createSlug(title) || 'bai-viet';

        let slug = baseSlug;
        let suffix = 1;

        while (true) {
            const queryBuilder =
                this.articleRepository
                    .createQueryBuilder('article')
                    .where('article.slug = :slug', {
                        slug,
                    });

            if (ignoredArticleId) {
                queryBuilder.andWhere(
                    'article.id != :ignoredArticleId',
                    {
                        ignoredArticleId,
                    },
                );
            }

            const exists =
                await queryBuilder.getExists();

            if (!exists) {
                return slug;
            }

            suffix += 1;
            slug = `${baseSlug}-${suffix}`;
        }
    }

    private toListResponse(article: Article) {
        return {
            id: article.id,
            title: article.title,
            slug: article.slug,
            coverImage: article.coverImage,
            sapo: article.sapo,
            type: article.type,
            viewCount: article.viewCount,
            author: {
                id: article.author.id,
                name: article.author.name,
            },
            category: {
                id: article.category.id,
                name: article.category.name,
                slug: article.category.slug,
            },
            publishedAt: article.publishedAt,
        };
    }

    private toStaffListResponse(
        article: Article,
    ) {
        return {
            ...this.toListResponse(
                article,
            ),

            coverImagePublicId:
                article.coverImagePublicId,

            status:
                article.status,

            isVisible:
                article.isVisible,

            rejectionReason:
                article.rejectionReason,

            createdAt:
                article.createdAt,

            updatedAt:
                article.updatedAt,
        };
    }

    private toDetailResponse(article: Article) {
        return {
            ...this.toStaffListResponse(article),
            content: article.content,
        };
    }

    private validateCoverImage(
        coverImage:
            | string
            | undefined,

        coverImagePublicId:
            | string
            | undefined,

        user: AuthenticatedUser,
    ): {
        url: string | null;
        publicId: string | null;
    } {
        const normalizedUrl =
            coverImage?.trim() || null;

        const normalizedPublicId =
            coverImagePublicId?.trim() ||
            null;

        if (
            Boolean(normalizedUrl) !==
            Boolean(normalizedPublicId)
        ) {
            throw new BadRequestException(
                'Phải truyền đồng thời coverImage và coverImagePublicId',
            );
        }

        if (normalizedPublicId) {
            this.cloudinaryService
                .assertCanManageArticleImage(
                    normalizedPublicId,
                    user,
                );
        }

        return {
            url: normalizedUrl,
            publicId:
                normalizedPublicId,
        };
    }
}