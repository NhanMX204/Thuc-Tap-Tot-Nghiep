import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsNotEmpty,
} from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({
        example: 'example@gmail.com',
    })
    @Transform(({ value }) =>
        typeof value === 'string'
            ? value.trim().toLowerCase()
            : value,
    )
    @IsNotEmpty({
        message: 'Email không được để trống',
    })
    @IsEmail(
        {},
        {
            message: 'Email không đúng định dạng',
        },
    )
    email!: string;
}