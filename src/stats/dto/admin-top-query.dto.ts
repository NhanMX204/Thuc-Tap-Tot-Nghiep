import {
    ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

import { StatsSortDirection } from '../enums/stats-sort-direction.enum';
import { StatsSortField } from '../enums/stats-sort-field.enum';
import { StatsTargetType } from '../enums/stats-target-type.enum';

export class AdminTopQueryDto {
    @ApiPropertyOptional({
        enum: StatsTargetType,
        default: StatsTargetType.AUTHOR,
    })
    @IsOptional()
    @IsEnum(StatsTargetType)
    targetType: StatsTargetType =
        StatsTargetType.AUTHOR;

    @ApiPropertyOptional({
        enum: StatsSortField,
        default: StatsSortField.VIEWS,
    })
    @IsOptional()
    @IsEnum(StatsSortField)
    sortBy: StatsSortField =
        StatsSortField.VIEWS;

    @ApiPropertyOptional({
        enum: StatsSortDirection,
        default: StatsSortDirection.DESC,
    })
    @IsOptional()
    @IsEnum(StatsSortDirection)
    sortDirection: StatsSortDirection =
        StatsSortDirection.DESC;

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
        default: 10,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;
}