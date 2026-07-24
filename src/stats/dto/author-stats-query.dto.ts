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

export class AuthorStatsQueryDto {
    @ApiPropertyOptional({
        example: 2,
        description:
            'Không truyền sẽ lấy tác giả đang đăng nhập',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: 'authorId phải là số nguyên',
    })
    @Min(1)
    authorId?: number;

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