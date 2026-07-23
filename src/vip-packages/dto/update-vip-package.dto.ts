import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateVipPackageDto {
    @ApiProperty({
        example: 'VIP 30 ngày',
    })
    @IsString()
    @IsNotEmpty({
        message: 'Tên gói VIP không được để trống',
    })
    @MaxLength(150)
    name!: string;

    @ApiProperty({
        example: 30,
    })
    @Type(() => Number)
    @IsInt({
        message: 'Thời hạn phải là số nguyên',
    })
    @Min(1, {
        message: 'Thời hạn phải lớn hơn 0',
    })
    durationDays!: number;

    @ApiProperty({
        example: 99000,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(1000, {
        message: 'Giá gói phải từ 1.000 đồng',
    })
    price!: number;

    @ApiProperty({
        example: 10,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercent!: number;

    @ApiProperty({
        example: 'Đọc toàn bộ nội dung VIP trong 30 ngày',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiProperty({
        example: true,
    })
    @IsBoolean()
    isActive!: boolean;
}