import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class StaffArticleQueryDto {
    @ApiPropertyOptional({
        example: 'kinh tế',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    q?: string;
}