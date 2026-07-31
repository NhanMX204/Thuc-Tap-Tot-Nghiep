import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

import { ArticleType } from '../enums/article-type.enum';

export class CreateArticleDto {
    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    @IsInt({
        message: 'categoryId phải là số nguyên',
    })
    @Min(1, {
        message: 'categoryId phải lớn hơn 0',
    })
    categoryId!: number;

    @ApiProperty({
        example:
            'https://res.cloudinary.com/.../image/upload/cover.jpg',
        required: false,
    })
    @IsOptional()
    @IsUrl(
        {
            require_protocol: true,
        },
        {
            message:
                'Đường dẫn ảnh không hợp lệ',
        },
    )
    @MaxLength(500)
    coverImage?: string;

    @ApiProperty({
        example:
            'bao-dien-tu/articles/user-3/abcxyz',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    coverImagePublicId?: string;

    @ApiProperty({
        example: 'Kinh tế Việt Nam tăng trưởng',
    })
    @IsString()
    @IsNotEmpty({
        message: 'Tiêu đề không được để trống',
    })
    @MinLength(5, {
        message: 'Tiêu đề phải có ít nhất 5 ký tự',
    })
    @MaxLength(255, {
        message: 'Tiêu đề không vượt quá 255 ký tự',
    })
    title!: string;

    @ApiProperty({
        example: 'Tình hình kinh tế Việt Nam...',
    })
    @IsString()
    @IsNotEmpty({
        message: 'Sapo không được để trống',
    })
    @MinLength(10, {
        message: 'Sapo phải có ít nhất 10 ký tự',
    })
    @MaxLength(2000, {
        message: 'Sapo không vượt quá 2000 ký tự',
    })
    sapo!: string;

    @ApiProperty({
        example: 'Nội dung đầy đủ của bài viết...',
    })
    @IsString()
    @IsNotEmpty({
        message: 'Nội dung không được để trống',
    })
    @MinLength(20, {
        message: 'Nội dung phải có ít nhất 20 ký tự',
    })
    content!: string;

    @ApiProperty({
        enum: ArticleType,
        example: ArticleType.NORMAL,
    })
    @IsEnum(ArticleType, {
        message: 'Loại bài viết không hợp lệ',
    })
    type!: ArticleType;
}