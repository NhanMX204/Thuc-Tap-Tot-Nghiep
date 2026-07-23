import {
    Controller,
    Get,
    ParseIntPipe,
    Query,
    Param,
    Req,
    Res,
} from '@nestjs/common';

import { randomUUID } from 'crypto';
import type {
    Request,
    Response,
} from 'express';

import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { ArticlesService } from './articles.service';
import { ArticleSearchQueryDto } from './dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(
        private readonly articlesService: ArticlesService,
    ) { }

    @Public()
    @Get('search')
    @ApiOperation({
        summary: 'Tìm kiếm bài viết công khai',
    })
    search(
        @Query() query: ArticleSearchQueryDto,
    ) {
        return this.articlesService.search(query);
    }

    @Get('summary')
    @Roles(UserRole.VIP, UserRole.ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Lấy nội dung bài viết cho VIP',
    })
    getSummary(
        @Query('articleId', ParseIntPipe)
        articleId: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.articlesService.getSummary(
            articleId,
            user,
        );
    }

    @Public()
    @Get(':articleId/preview')
    @ApiOperation({
        summary: 'Xem trước bài viết',
    })
    preview(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.articlesService.preview(
            articleId,
        );
    }

    @OptionalAuth()
    @Get(':articleId/read')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Đọc bài viết',
    })
    read(
        @Param('articleId', ParseIntPipe)
        articleId: number,

        @CurrentUser()
        user: AuthenticatedUser | null,

        @Req()
        request: Request,

        @Res({ passthrough: true })
        response: Response,
    ) {
        let readerKey =
            request.cookies?.bdt_reader_key as
            | string
            | undefined;

        /*
         * Người chưa đăng nhập được nhận diện bằng
         * cookie ngẫu nhiên có thời hạn một năm.
         */
        if (!user && !readerKey) {
            readerKey = randomUUID();

            response.cookie(
                'bdt_reader_key',
                readerKey,
                {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV ===
                        'production',
                    sameSite: 'lax',
                    maxAge:
                        365 *
                        24 *
                        60 *
                        60 *
                        1000,
                    path: '/',
                },
            );
        }

        return this.articlesService.read(
            articleId,
            user ?? null,
            {
                readerKey,
                ipAddress: request.ip,
                userAgent:
                    request.headers['user-agent'],
            },
        );
    }
}