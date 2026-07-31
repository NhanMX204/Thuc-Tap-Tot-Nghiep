import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        description:
            'Token nhận được sau khi xác thực mã OTP',
    })
    @IsString()
    @IsNotEmpty({
        message:
            'Reset token không được để trống',
    })
    resetToken!: string;

    @ApiProperty({
        example: 'NewPassword123',
    })
    @IsString()
    @IsNotEmpty({
        message:
            'Mật khẩu mới không được để trống',
    })
    @MinLength(8, {
        message:
            'Mật khẩu phải có ít nhất 8 ký tự',
    })
    @MaxLength(50)
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        {
            message:
                'Mật khẩu phải có chữ hoa, chữ thường và chữ số',
        },
    )
    newPassword!: string;

    @ApiProperty({
        example: 'NewPassword123',
    })
    @IsString()
    @IsNotEmpty({
        message:
            'Xác nhận mật khẩu không được để trống',
    })
    confirmation!: string;
}