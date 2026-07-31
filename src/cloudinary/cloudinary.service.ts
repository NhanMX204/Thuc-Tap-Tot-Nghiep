import {
    BadGatewayException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    v2 as cloudinary,
} from 'cloudinary';

import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CLOUDINARY } from './cloudinary.constants';
import { CloudinaryImageResult } from './interfaces/cloudinary-image-result.interface';

@Injectable()
export class CloudinaryService {
    private readonly logger =
        new Logger(
            CloudinaryService.name,
        );

    constructor(
        @Inject(CLOUDINARY)
        private readonly cloudinaryClient:
            typeof cloudinary,

        private readonly configService:
            ConfigService,
    ) { }

    async uploadArticleImage(
        file: Express.Multer.File,
        userId: number,
    ): Promise<CloudinaryImageResult> {
        const folder =
            this.buildArticleFolder(userId);

        return this.uploadImage(
            file,
            folder,
        );
    }

    async uploadImage(
        file: Express.Multer.File,
        folder: string,
    ): Promise<CloudinaryImageResult> {
        if (!file?.buffer) {
            throw new BadGatewayException(
                'Không đọc được dữ liệu ảnh',
            );
        }

        return new Promise(
            (resolve, reject) => {
                const uploadStream =
                    this.cloudinaryClient.uploader
                        .upload_stream(
                            {
                                folder,

                                resource_type: 'image',

                                unique_filename: true,

                                overwrite: false,

                                use_filename: false,
                            },

                            (error, result) => {
                                if (error) {
                                    this.logger.error(
                                        'Upload ảnh Cloudinary thất bại',
                                        JSON.stringify({
                                            message:
                                                error.message,
                                            name:
                                                error.name,
                                            httpCode:
                                                error.http_code,
                                        }),
                                    );

                                    reject(
                                        new BadGatewayException(
                                            error.message ||
                                            'Upload ảnh lên Cloudinary thất bại',
                                        ),
                                    );

                                    return;
                                }

                                if (!result) {
                                    reject(
                                        new BadGatewayException(
                                            'Cloudinary không trả về kết quả upload',
                                        ),
                                    );

                                    return;
                                }

                                resolve({
                                    publicId:
                                        result.public_id,

                                    url:
                                        result.secure_url,

                                    width:
                                        result.width,

                                    height:
                                        result.height,

                                    format:
                                        result.format,

                                    bytes:
                                        result.bytes,

                                    resourceType:
                                        result.resource_type,

                                    createdAt:
                                        result.created_at,
                                });
                            },
                        );

                uploadStream.end(
                    file.buffer,
                );
            },
        );
    }

    async deleteImage(
        publicId: string,
    ): Promise<void> {
        try {
            const result =
                await this.cloudinaryClient
                    .uploader.destroy(
                        publicId,
                        {
                            resource_type:
                                'image',

                            invalidate: true,
                        },
                    );

            if (
                result.result !== 'ok' &&
                result.result !==
                'not found'
            ) {
                throw new Error(
                    `Cloudinary destroy result: ${result.result}`,
                );
            }
        } catch (error) {
            this.logger.error(
                `Xóa ảnh Cloudinary thất bại: ${publicId}`,
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new BadGatewayException(
                'Không thể xóa ảnh trên Cloudinary',
            );
        }
    }

    assertCanManageArticleImage(
        publicId: string,
        user: AuthenticatedUser,
    ): void {
        const normalizedPublicId =
            publicId
                .trim()
                .replace(/^\/+/, '');

        const articleRoot =
            `${this.getRootFolder()}/articles/`;

        /*
         * Không cho xóa ảnh nằm ngoài thư mục
         * của dự án báo điện tử.
         */
        if (
            !normalizedPublicId.startsWith(
                articleRoot,
            )
        ) {
            throw new ForbiddenException(
                'Bạn không có quyền quản lý ảnh này',
            );
        }

        /*
         * ADMIN được quản lý toàn bộ ảnh bài viết.
         */
        if (
            user.role ===
            UserRole.ADMIN
        ) {
            return;
        }

        const userFolder =
            this.buildArticleFolder(
                user.id,
            );

        if (
            !normalizedPublicId.startsWith(
                `${userFolder}/`,
            )
        ) {
            throw new ForbiddenException(
                'Bạn chỉ được quản lý ảnh do mình tải lên',
            );
        }
    }

    buildArticleFolder(
        userId: number,
    ): string {
        return (
            `${this.getRootFolder()}` +
            `/articles/user-${userId}`
        );
    }

    private getRootFolder(): string {
        const configuredFolder =
            this.configService
                .get<string>(
                    'CLOUDINARY_FOLDER',
                )
                ?.trim();

        return (
            configuredFolder ||
            'bao-dien-tu'
        )
            .replace(/^\/+|\/+$/g, '')
            .replace(/\/+/g, '/');
    }
}