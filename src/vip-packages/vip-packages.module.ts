import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminVipPackagesController } from './admin-vip-packages.controller';
import { VipPackage } from './entities/vip-package.entity';
import { VipPackagesController } from './vip-packages.controller';
import { VipPackagesService } from './vip-packages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VipPackage]),
  ],
  controllers: [
    VipPackagesController,
    AdminVipPackagesController,
  ],
  providers: [VipPackagesService],
  exports: [VipPackagesService],
})
export class VipPackagesModule { }