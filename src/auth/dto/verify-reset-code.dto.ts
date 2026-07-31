import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsNotEmpty,
    Matches,
} from 'class-validator';

export class VerifyResetCodeDto {
    @ApiProperty({
        example: 'example@gmail.com',
    })
    @Transform(({ value }) =>
        typeof value === 'string'
            ? value.trim().toLowerCase()
            : value,
    )
    @IsEmail(
        {},
        {
            message: 'Email không đúng định dạng',
        },
    )
    email!: string;

    @ApiProperty({
        example: '123456',
    })
    @IsNotEmpty({
        message: 'Mã xác nhận không được để trống',
    })
    @Matches(/^\d{6}$/, {
        message:
            'Mã xác nhận phải gồm đúng 6 chữ số',
    })
    code!: string;
}