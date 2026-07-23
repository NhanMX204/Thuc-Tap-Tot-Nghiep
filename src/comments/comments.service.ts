import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArticlesService } from '../articles/articles.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment)
        private readonly commentRepository: Repository<Comment>,

        private readonly articlesService: ArticlesService,
    ) { }

    async findByArticle(articleId: number) {
        /*
         * Chỉ lấy bình luận nếu bài viết đã được
         * duyệt và đang hiển thị.
         */
        await this.articlesService
            .getPublicArticleForInteraction(
                articleId,
            );

        const comments =
            await this.commentRepository.find({
                where: {
                    articleId,
                    isVisible: true,
                },
                relations: {
                    user: true,
                },
                order: {
                    createdAt: 'ASC',
                },
            });

        return comments.map((comment) =>
            this.toResponse(comment),
        );
    }

    async create(
        articleId: number,
        user: AuthenticatedUser,
        dto: CreateCommentDto,
    ) {
        /*
         * Người dùng thường không được bình luận
         * bài VIP nếu không có quyền đọc bài.
         */
        await this.articlesService
            .getAccessiblePublicArticle(
                articleId,
                user,
            );

        const comment =
            this.commentRepository.create({
                articleId,
                userId: user.id,
                content: dto.content.trim(),
                isVisible: true,
            });

        const savedComment =
            await this.commentRepository.save(
                comment,
            );

        const fullComment =
            await this.commentRepository.findOne({
                where: {
                    id: savedComment.id,
                },
                relations: {
                    user: true,
                },
            });

        return {
            message: 'Bình luận thành công',
            comment: fullComment
                ? this.toResponse(fullComment)
                : null,
        };
    }

    private toResponse(comment: Comment) {
        return {
            id: comment.id,
            content: comment.content,
            articleId: comment.articleId,
            user: {
                id: comment.user.id,
                name: comment.user.name,
            },
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
        };
    }
}