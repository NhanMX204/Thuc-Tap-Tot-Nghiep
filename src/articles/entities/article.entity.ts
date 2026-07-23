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

import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { ArticleStatus } from '../enums/article-status.enum';
import { ArticleType } from '../enums/article-type.enum';

@Entity('articles')
@Index('IDX_ARTICLES_AUTHOR', ['authorId'])
@Index('IDX_ARTICLES_CATEGORY', ['categoryId'])
@Index('IDX_ARTICLES_STATUS_VISIBLE', [
    'status',
    'isVisible',
])
export class Article {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        name: 'author_id',
        type: 'int',
    })
    authorId!: number;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({
        name: 'author_id',
    })
    author!: User;

    @Column({
        name: 'category_id',
        type: 'int',
    })
    categoryId!: number;

    @ManyToOne(() => Category, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({
        name: 'category_id',
    })
    category!: Category;

    @Column({
        name: 'cover_image',
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    coverImage!: string | null;

    @Column({
        type: 'varchar',
        length: 255,
    })
    title!: string;

    @Column({
        type: 'varchar',
        length: 300,
        unique: true,
    })
    slug!: string;

    @Column({
        type: 'text',
    })
    sapo!: string;

    @Column({
        type: 'longtext',
    })
    content!: string;

    @Column({
        type: 'enum',
        enum: ArticleType,
        default: ArticleType.NORMAL,
    })
    type!: ArticleType;

    @Column({
        type: 'enum',
        enum: ArticleStatus,
        default: ArticleStatus.PENDING,
    })
    status!: ArticleStatus;

    @Column({
        name: 'rejection_reason',
        type: 'varchar',
        length: 1000,
        nullable: true,
    })
    rejectionReason!: string | null;

    @Column({
        name: 'is_visible',
        type: 'boolean',
        default: false,
    })
    isVisible!: boolean;

    @Column({
        name: 'view_count',
        type: 'int',
        unsigned: true,
        default: 0,
    })
    viewCount!: number;

    @Column({
        name: 'published_at',
        type: 'datetime',
        nullable: true,
    })
    publishedAt!: Date | null;

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