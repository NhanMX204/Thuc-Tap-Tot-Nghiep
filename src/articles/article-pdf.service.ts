import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import PDFDocument from 'pdfkit';

import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ArticlesService } from './articles.service';

interface GeneratedPdf {
    buffer: Buffer;
    fileName: string;
}

@Injectable()
export class ArticlePdfService {
    constructor(
        private readonly articlesService: ArticlesService,
        private readonly configService: ConfigService,
    ) { }

    async generate(
        articleId: number,
        user: AuthenticatedUser,
    ): Promise<GeneratedPdf> {
        const article =
            await this.articlesService
                .getAccessiblePublicArticle(
                    articleId,
                    user,
                );

        const buffer = await new Promise<Buffer>(
            (resolve, reject) => {
                const document = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 55,
                        bottom: 55,
                        left: 60,
                        right: 60,
                    },
                    info: {
                        Title: article.title,
                        Author: article.author.name,
                        Subject: article.sapo,
                    },
                });

                const chunks: Buffer[] = [];

                document.on(
                    'data',
                    (chunk: Buffer) => {
                        chunks.push(Buffer.from(chunk));
                    },
                );

                document.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });

                document.on('error', reject);

                try {
                    const normalFontPath =
                        this.configService.get<string>(
                            'PDF_FONT_PATH',
                        );

                    const boldFontPath =
                        this.configService.get<string>(
                            'PDF_BOLD_FONT_PATH',
                        );

                    let normalFont = 'Times-Roman';
                    let boldFont = 'Times-Bold';

                    if (
                        normalFontPath &&
                        existsSync(normalFontPath)
                    ) {
                        document.registerFont(
                            'ArticleNormal',
                            normalFontPath,
                        );

                        normalFont = 'ArticleNormal';
                    }

                    if (
                        boldFontPath &&
                        existsSync(boldFontPath)
                    ) {
                        document.registerFont(
                            'ArticleBold',
                            boldFontPath,
                        );

                        boldFont = 'ArticleBold';
                    }

                    document
                        .font(boldFont)
                        .fontSize(22)
                        .text(article.title, {
                            align: 'center',
                        });

                    document.moveDown(0.8);

                    document
                        .font(normalFont)
                        .fontSize(10)
                        .fillColor('#555555')
                        .text(
                            `Tác giả: ${article.author.name}`,
                            {
                                align: 'center',
                            },
                        );

                    document.text(
                        `Danh mục: ${article.category.name}`,
                        {
                            align: 'center',
                        },
                    );

                    if (article.publishedAt) {
                        document.text(
                            `Ngày đăng: ${new Date(
                                article.publishedAt,
                            ).toLocaleString('vi-VN')}`,
                            {
                                align: 'center',
                            },
                        );
                    }

                    document.moveDown(1.5);

                    document
                        .font(boldFont)
                        .fontSize(12)
                        .fillColor('#222222')
                        .text(article.sapo, {
                            align: 'justify',
                            lineGap: 3,
                        });

                    document.moveDown();

                    document
                        .font(normalFont)
                        .fontSize(11)
                        .fillColor('#111111')
                        .text(
                            this.convertHtmlToText(
                                article.content,
                            ),
                            {
                                align: 'justify',
                                lineGap: 4,
                            },
                        );

                    document.moveDown(2);

                    document
                        .font(normalFont)
                        .fontSize(9)
                        .fillColor('#777777')
                        .text(
                            'Tài liệu được xuất từ hệ thống Báo điện tử.',
                            {
                                align: 'center',
                            },
                        );

                    document.end();
                } catch (error) {
                    reject(error);
                }
            },
        );

        return {
            buffer,
            fileName: `${article.slug}.pdf`,
        };
    }

    private convertHtmlToText(
        content: string,
    ): string {
        return content
            .replace(
                /<br\s*\/?>/gi,
                '\n',
            )
            .replace(
                /<\/p>/gi,
                '\n\n',
            )
            .replace(
                /<\/div>/gi,
                '\n',
            )
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}