import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Res,
    StreamableFile,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ArticlePdfService } from './article-pdf.service';

@ApiTags('Article Download')
@ApiBearerAuth('access-token')
@Controller('articles')
export class ArticleDownloadController {
    constructor(
        private readonly articlePdfService: ArticlePdfService,
    ) { }

    @Get(':articleId/download-pdf')
    @ApiOperation({
        summary:
            'Tải bài viết dưới dạng PDF',
    })
    @ApiProduces('application/pdf')
    async downloadPdf(
        @Param('articleId', ParseIntPipe)
        articleId: number,

        @CurrentUser()
        user: AuthenticatedUser,

        @Res({ passthrough: true })
        response: Response,
    ): Promise<StreamableFile> {
        const result =
            await this.articlePdfService.generate(
                articleId,
                user,
            );

        response.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition':
                `attachment; filename*=UTF-8''` +
                encodeURIComponent(
                    result.fileName,
                ),
            'Content-Length':
                result.buffer.length.toString(),
        });

        return new StreamableFile(
            result.buffer,
        );
    }
}