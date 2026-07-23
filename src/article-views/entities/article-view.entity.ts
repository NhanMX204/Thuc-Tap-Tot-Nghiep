import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Article } from '../../articles/entities/article.entity';
import { User } from '../../users/entities/user.entity';

@Entity('article_views')
@Index('IDX_ARTICLE_VIEWS_ARTICLE_TIME', [
    'articleId',
    'viewedAt',
])
@Index('IDX_ARTICLE_VIEWS_USER_TIME', [
    'userId',
    'viewedAt',
])
@Index('IDX_ARTICLE_VIEWS_READER_TIME', [
    'readerKey',
    'viewedAt',
])
export class ArticleView {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        name: 'article_id',
        type: 'int',
    })
    articleId!: number;

    @ManyToOne(() => Article, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'article_id',
    })
    article!: Article;

    @Column({
        name: 'user_id',
        type: 'int',
        nullable: true,
    })
    userId!: number | null;

    @ManyToOne(() => User, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({
        name: 'user_id',
    })
    user!: User | null;

    @Column({
        name: 'reader_key',
        type: 'varchar',
        length: 36,
        nullable: true,
    })
    readerKey!: string | null;

    @Column({
        name: 'ip_address',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    ipAddress!: string | null;

    @Column({
        name: 'user_agent',
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    userAgent!: string | null;

    @CreateDateColumn({
        name: 'viewed_at',
        type: 'datetime',
    })
    viewedAt!: Date;
}