import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({
        example:
            'Bài viết cung cấp thông tin rất hữu ích.',
    })
    @Transform(({ value }) =>
        typeof value === 'string'
            ? value.trim()
            : value,
    )
    @IsString({
        message:
            'Nội dung bình luận phải là chuỗi',
    })
    @IsNotEmpty({
        message:
            'Nội dung bình luận không được để trống',
    })
    @MaxLength(2000, {
        message:
            'Bình luận không được vượt quá 2000 ký tự',
    })
    content!: string;
}