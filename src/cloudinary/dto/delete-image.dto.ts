import {
    ApiProperty,
} from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    MaxLength,
} from 'class-validator';

export class DeleteImageDto {
    @ApiProperty({
        example:
            'bao-dien-tu/articles/user-3/a1b2c3d4',
    })
    @IsString({
        message:
            'publicId phải là chuỗi',
    })
    @IsNotEmpty({
        message:
            'publicId không được để trống',
    })
    @MaxLength(500)
    publicId!: string;
}