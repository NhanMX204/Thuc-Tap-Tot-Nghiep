import {
    Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    v2 as cloudinary,
} from 'cloudinary';

import { CLOUDINARY } from './cloudinary.constants';

export const cloudinaryProvider: Provider = {
    provide: CLOUDINARY,

    inject: [ConfigService],

    useFactory: (
        configService: ConfigService,
    ) => {
        const cloudName =
            configService
                .get<string>(
                    'CLOUDINARY_CLOUD_NAME',
                )
                ?.trim();

        const apiKey =
            configService
                .get<string>(
                    'CLOUDINARY_API_KEY',
                )
                ?.trim();

        const apiSecret =
            configService
                .get<string>(
                    'CLOUDINARY_API_SECRET',
                )
                ?.trim();

        if (!cloudName) {
            throw new Error(
                'CLOUDINARY_CLOUD_NAME chưa được cấu hình',
            );
        }

        if (!apiKey) {
            throw new Error(
                'CLOUDINARY_API_KEY chưa được cấu hình',
            );
        }

        if (!apiSecret) {
            throw new Error(
                'CLOUDINARY_API_SECRET chưa được cấu hình',
            );
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });

        return cloudinary;
    },
};