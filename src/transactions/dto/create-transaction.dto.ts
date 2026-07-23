import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt,
    Min,
} from 'class-validator';

export class CreateTransactionDto {
    @ApiProperty({
        example: 1,
    })
    @Type(() => Number)
    @IsInt({
        message: 'packageId phải là số nguyên',
    })
    @Min(1, {
        message: 'packageId phải lớn hơn 0',
    })
    packageId!: number;
}