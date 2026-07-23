import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

import { ArticleType } from '../enums/article-type.enum';

export class UpdateArticleDto {
    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    @IsInt({
        message: 'categoryId phải là số nguyên',
    })
    @Min(1)
    categoryId!: number;

    @ApiProperty({
        example: 'https://example.com/new-cover.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    coverImage?: string;

    @ApiProperty({
        example: 'Tiêu đề bài viết đã cập nhật',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(255)
    title!: string;

    @ApiProperty({
        example: 'Mô tả ngắn đã cập nhật',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(2000)
    sapo!: string;

    @ApiProperty({
        example: 'Nội dung bài viết đã cập nhật...',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(20)
    content!: string;

    @ApiProperty({
        enum: ArticleType,
    })
    @IsEnum(ArticleType)
    type!: ArticleType;
}