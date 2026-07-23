import {
    ApiProperty,
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ModerationDecisionDto {
    @ApiProperty({
        example: true,
    })
    @IsBoolean({
        message: 'approved phải là boolean',
    })
    approved!: boolean;

    @ApiPropertyOptional({
        example: 'Nội dung chưa đúng quy định',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    rejectionReason?: string;
}