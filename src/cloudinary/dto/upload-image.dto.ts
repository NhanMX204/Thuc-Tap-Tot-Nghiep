import {
    ApiProperty,
} from '@nestjs/swagger';

export class UploadImageDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description:
            'Ảnh JPG, JPEG, PNG hoặc WEBP; tối đa 5 MB',
    })
    file!: unknown;
}