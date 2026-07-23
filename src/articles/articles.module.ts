import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriesModule } from '../categories/categories.module';

import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ModerationArticlesController } from './moderation-articles.controller';
import { StaffArticlesController } from './staff-articles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article]),
    CategoriesModule,
  ],
  controllers: [
    ArticlesController,
    StaffArticlesController,
    ModerationArticlesController,
  ],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule { }