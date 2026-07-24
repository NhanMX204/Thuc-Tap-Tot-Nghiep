import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    Min,
} from 'class-validator';

import { StatsGranularity } from '../enums/stats-granularity.enum';

export class ArticleStatsQueryDto {
    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    @IsInt({
        message: 'articleId phải là số nguyên',
    })
    @Min(1, {
        message: 'articleId phải lớn hơn 0',
    })
    articleId!: number;

    @ApiPropertyOptional({
        example: '2026-07-01',
    })
    @IsOptional()
    @IsDateString(
        {},
        {
            message: 'startDate không đúng định dạng ngày',
        },
    )
    startDate?: string;

    @ApiPropertyOptional({
        example: '2026-07-31',
    })
    @IsOptional()
    @IsDateString(
        {},
        {
            message: 'endDate không đúng định dạng ngày',
        },
    )
    endDate?: string;

    @ApiPropertyOptional({
        enum: StatsGranularity,
        default: StatsGranularity.DAY,
    })
    @IsOptional()
    @IsEnum(StatsGranularity, {
        message: 'granularity phải là day, week hoặc month',
    })
    granularity: StatsGranularity =
        StatsGranularity.DAY;
}