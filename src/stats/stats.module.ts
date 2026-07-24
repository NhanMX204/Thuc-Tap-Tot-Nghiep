import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArticleView } from '../article-views/entities/article-view.entity';
import { Article } from '../articles/entities/article.entity';
import { Category } from '../categories/entities/category.entity';
import { Comment } from '../comments/entities/comment.entity';
import { VipTransaction } from '../transactions/entities/vip-transaction.entity';
import { User } from '../users/entities/user.entity';
import { VipPackage } from '../vip-packages/entities/vip-package.entity';

import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticleView,
      Comment,
      User,
      Category,
      VipPackage,
      VipTransaction,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule { }