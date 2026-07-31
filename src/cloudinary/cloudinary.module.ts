import {
  Global,
  Module,
} from '@nestjs/common';
import {
  ConfigModule,
} from '@nestjs/config';

import { cloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
  ],

  controllers: [
    UploadsController,
  ],

  providers: [
    /*
     * Bắt buộc phải có provider này.
     * Nó cung cấp Symbol(CLOUDINARY).
     */
    cloudinaryProvider,

    CloudinaryService,
  ],

  exports: [
    /*
     * Export service để module khác sử dụng.
     */
    CloudinaryService,

    /*
     * Có thể export token nếu module khác
     * cần inject trực tiếp Cloudinary SDK.
     */
    cloudinaryProvider,
  ],
})
export class CloudinaryModule { }