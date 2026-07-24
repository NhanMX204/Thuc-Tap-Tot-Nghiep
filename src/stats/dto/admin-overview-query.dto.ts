import {
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

export class AdminOverviewQueryDto {
    @ApiPropertyOptional({
        example: 2,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    authorId?: number;

    @ApiPropertyOptional({
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

    @ApiPropertyOptional({
        example: '2026-07-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        example: '2026-07-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        enum: StatsGranularity,
        default: StatsGranularity.DAY,
    })
    @IsOptional()
    @IsEnum(StatsGranularity)
    groupBy: StatsGranularity =
        StatsGranularity.DAY;
}