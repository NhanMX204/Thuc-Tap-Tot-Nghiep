import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
    DataSource,
    MoreThan,
} from 'typeorm';

import { Article } from '../articles/entities/article.entity';
import { ArticleView } from './entities/article-view.entity';

export interface RecordArticleViewInput {
    articleId: number;
    userId?: number;
    readerKey?: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class ArticleViewsService {
    private readonly duplicateViewMinutes = 30;

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    async recordView(
        input: RecordArticleViewInput,
    ): Promise<number> {
        if (!input.userId && !input.readerKey) {
            throw new BadRequestException(
                'Không xác định được người đọc',
            );
        }

        const duplicateThreshold = new Date(
            Date.now() -
            this.duplicateViewMinutes *
            60 *
            1000,
        );

        return this.dataSource.transaction(
            async (manager) => {
                const viewRepository =
                    manager.getRepository(ArticleView);

                const articleRepository =
                    manager.getRepository(Article);

                const recentView = input.userId
                    ? await viewRepository.findOne({
                        where: {
                            articleId: input.articleId,
                            userId: input.userId,
                            viewedAt: MoreThan(
                                duplicateThreshold,
                            ),
                        },
                    })
                    : await viewRepository.findOne({
                        where: {
                            articleId: input.articleId,
                            readerKey: input.readerKey,
                            viewedAt: MoreThan(
                                duplicateThreshold,
                            ),
                        },
                    });

                /*
                 * Không tăng lại lượt xem nếu cùng người đọc
                 * đã mở bài trong vòng 30 phút.
                 */
                if (!recentView) {
                    const articleView =
                        viewRepository.create({
                            articleId: input.articleId,
                            userId: input.userId ?? null,
                            readerKey:
                                input.readerKey ?? null,
                            ipAddress:
                                input.ipAddress ?? null,
                            userAgent:
                                input.userAgent
                                    ?.slice(0, 500) ?? null,
                        });

                    await viewRepository.save(
                        articleView,
                    );

                    await articleRepository.increment(
                        {
                            id: input.articleId,
                        },
                        'viewCount',
                        1,
                    );
                }

                const article =
                    await articleRepository.findOne({
                        where: {
                            id: input.articleId,
                        },
                        select: {
                            id: true,
                            viewCount: true,
                        },
                    });

                return article?.viewCount ?? 0;
            },
        );
    }
}