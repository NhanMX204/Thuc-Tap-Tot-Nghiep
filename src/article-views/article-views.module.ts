import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Article } from '../articles/entities/article.entity';
import { ArticleView } from './entities/article-view.entity';
import { ArticleViewsService } from './article-views.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ArticleView,
      Article,
    ]),
  ],
  providers: [ArticleViewsService],
  exports: [ArticleViewsService],
})
export class ArticleViewsModule { }