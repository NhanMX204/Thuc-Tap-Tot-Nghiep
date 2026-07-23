import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Article Comments')
@Controller('articles/:articleId/comments')
export class CommentsController {
    constructor(
        private readonly commentsService: CommentsService,
    ) { }

    @Public()
    @Get()
    @ApiOperation({
        summary:
            'Lấy danh sách bình luận của bài viết',
    })
    findAll(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.commentsService.findByArticle(
            articleId,
        );
    }

    @Post()
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Viết bình luận',
    })
    create(
        @Param('articleId', ParseIntPipe)
        articleId: number,

        @CurrentUser()
        user: AuthenticatedUser,

        @Body()
        dto: CreateCommentDto,
    ) {
        return this.commentsService.create(
            articleId,
            user,
            dto,
        );
    }
}