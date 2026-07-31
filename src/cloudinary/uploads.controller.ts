import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    ParseFilePipeBuilder,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {
    FileInterceptor,
} from '@nestjs/platform-express';
import {
    memoryStorage,
} from 'multer';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CloudinaryService } from './cloudinary.service';
import { DeleteImageDto } from './dto/delete-image.dto';
import { UploadImageDto } from './dto/upload-image.dto';

@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@Controller('uploads')
export class UploadsController {
    constructor(
        private readonly cloudinaryService:
            CloudinaryService,
    ) { }

    @Post('article-image')
    @Roles(
        UserRole.AUTHOR,
        UserRole.ADMIN,
    )
    @UseInterceptors(
        FileInterceptor(
            'file',
            {
                storage: memoryStorage(),

                limits: {
                    files: 1,

                    /*
                     * 5 MB.
                     */
                    fileSize:
                        5 * 1024 * 1024,
                },
            },
        ),
    )
    @ApiConsumes(
        'multipart/form-data',
    )
    @ApiBody({
        type: UploadImageDto,
    })
    @ApiOperation({
        summary:
            'Upload ảnh bài viết lên Cloudinary',
    })
    async uploadArticleImage(
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType:
                        /^image\/(jpeg|png|webp)$/,
                })
                .addMaxSizeValidator({
                    maxSize:
                        5 * 1024 * 1024,
                })
                .build({
                    fileIsRequired: true,

                    errorHttpStatusCode:
                        HttpStatus
                            .UNPROCESSABLE_ENTITY,
                }),
        )
        file: Express.Multer.File,

        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        const image =
            await this.cloudinaryService
                .uploadArticleImage(
                    file,
                    user.id,
                );

        return {
            message:
                'Upload ảnh thành công',

            image,
        };
    }

    @Delete('article-image')
    @Roles(
        UserRole.AUTHOR,
        UserRole.ADMIN,
    )
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Xóa ảnh bài viết trên Cloudinary',
    })
    async deleteArticleImage(
        @Body()
        dto: DeleteImageDto,

        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        this.cloudinaryService
            .assertCanManageArticleImage(
                dto.publicId,
                user,
            );

        await this.cloudinaryService
            .deleteImage(
                dto.publicId,
            );

        return {
            message:
                'Xóa ảnh thành công',
        };
    }
}