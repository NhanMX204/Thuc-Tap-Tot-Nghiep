import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'example@gmail.com',
    })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
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

    @ApiProperty({
        example: 'Example12345',
    })
    @IsString({
        message: 'Mật khẩu phải là chuỗi',
    })
    @IsNotEmpty({
        message: 'Mật khẩu không được để trống',
    })
    password!: string;
}