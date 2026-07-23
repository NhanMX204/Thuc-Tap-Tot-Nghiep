import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArticleViewsModule } from '../article-views/article-views.module';
import { CategoriesModule } from '../categories/categories.module';
import { ArticleDownloadController } from './article-download.controller';
import { ArticlePdfService } from './article-pdf.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ModerationArticlesController } from './moderation-articles.controller';
import { StaffArticlesController } from './staff-articles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    CategoriesModule,
    ArticleViewsModule,
  ],
  controllers: [
    ArticlesController,
    StaffArticlesController,
    ModerationArticlesController,
    ArticleDownloadController,
  ],
  providers: [
    ArticlesService,
    ArticlePdfService,
  ],
  exports: [ArticlesService],
})
export class ArticlesModule { }