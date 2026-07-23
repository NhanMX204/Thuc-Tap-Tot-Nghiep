import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ArticleSearchQueryDto {
    @ApiPropertyOptional({
        example: 'kinh tế',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    keyword?: string;

    @ApiPropertyOptional({
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

    @ApiPropertyOptional({
        example: 'Nguyen Van A',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    authorName?: string;
}