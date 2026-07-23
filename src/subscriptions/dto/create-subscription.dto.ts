import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    Min,
} from 'class-validator';

import { SubscriptionTargetType } from '../enums/subscription-target-type.enum';

export class CreateSubscriptionDto {
    @ApiProperty({
        enum: SubscriptionTargetType,
        example:
            SubscriptionTargetType.AUTHOR,
    })
    @IsEnum(SubscriptionTargetType, {
        message:
            'targetType phải là AUTHOR hoặc CATEGORY',
    })
    targetType!: SubscriptionTargetType;

    @ApiProperty({
        example: 2,
    })
    @Type(() => Number)
    @IsInt({
        message:
            'targetId phải là số nguyên',
    })
    @Min(1, {
        message:
            'targetId phải lớn hơn 0',
    })
    targetId!: number;
}