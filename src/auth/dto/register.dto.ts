import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
    @ApiPropertyOptional({
        enum: [UserRole.MEMBER, UserRole.AUTHOR],
        default: UserRole.MEMBER,
        description: 'Loại tài khoản: MEMBER (độc giả) hoặc AUTHOR (tác giả)',
    })
    @IsOptional()
    @IsEnum([UserRole.MEMBER, UserRole.AUTHOR], {
        message: 'Loại tài khoản chỉ được là MEMBER hoặc AUTHOR',
    })
    role?: UserRole.MEMBER | UserRole.AUTHOR;
    @ApiProperty({
        example: 'Nguyen Van A',
        description: 'Họ và tên của người dùng',
    })
    @IsString({
        message: 'Tên phải là chuỗi',
    })
    @IsNotEmpty({
        message: 'Tên không được để trống',
    })
    @MinLength(2, {
        message: 'Tên phải có ít nhất 2 ký tự',
    })
    @MaxLength(100, {
        message: 'Tên không được vượt quá 100 ký tự',
    })
    name: string;

    @ApiProperty({
        example: 'example@gmail.com',
        description: 'Email đăng nhập',
    })
    @IsNotEmpty({
        message: 'Email không được để trống',
    })
    @IsEmail(
        {},
        {
            message: 'Email không đúng định dạng',
        },
    )
    @MaxLength(255, {
        message: 'Email không được vượt quá 255 ký tự',
    })
    email: string;

    @ApiProperty({
        example: 'Example@123456',
        description:
            'Mật khẩu có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số',
    })
    @IsString({
        message: 'Mật khẩu phải là chuỗi',
    })
    @IsNotEmpty({
        message: 'Mật khẩu không được để trống',
    })
    @MinLength(8, {
        message: 'Mật khẩu phải có ít nhất 8 ký tự',
    })
    @MaxLength(50, {
        message: 'Mật khẩu không được vượt quá 50 ký tự',
    })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
        message:
            'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số',
    })
    password: string;

    @ApiProperty({
        example: 'Example@123456',
        description: 'Nhập lại mật khẩu',
    })
    @IsString({
        message: 'Xác nhận mật khẩu phải là chuỗi',
    })
    @IsNotEmpty({
        message: 'Xác nhận mật khẩu không được để trống',
    })
    confirmation: string;
}