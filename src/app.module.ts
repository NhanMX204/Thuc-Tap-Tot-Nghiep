import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ArticlesModule } from './articles/articles.module';
import { CommentsModule } from './comments/comments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { VipPackagesModule } from './vip-packages/vip-packages.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StatsModule } from './stats/stats.module';
import { SessionsModule } from './sessions/sessions.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ArticleViewsModule } from './article-views/article-views.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PasswordResetsModule } from './password-resets/password-resets.module';
import { MailModule } from './mail/mail.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),

    UsersModule,

    AuthModule,

    CategoriesModule,

    ArticlesModule,

    CommentsModule,

    SubscriptionsModule,

    VipPackagesModule,

    TransactionsModule,

    StatsModule,

    SessionsModule,

    ArticleViewsModule,

    PasswordResetsModule,

    MailModule,

    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule { }