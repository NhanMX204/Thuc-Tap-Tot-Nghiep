import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { Article } from '../../articles/entities/article.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
@Index('IDX_COMMENTS_ARTICLE_CREATED', [
    'articleId',
    'createdAt',
])
@Index('IDX_COMMENTS_USER', ['userId'])
export class Comment {
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
    })
    userId!: number;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'user_id',
    })
    user!: User;

    @Column({
        type: 'text',
    })
    content!: string;

    @Column({
        name: 'is_visible',
        type: 'boolean',
        default: true,
    })
    isVisible!: boolean;

    @CreateDateColumn({
        name: 'created_at',
        type: 'datetime',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'datetime',
    })
    updatedAt!: Date;
}