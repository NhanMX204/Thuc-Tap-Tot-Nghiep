import { Module } from '@nestjs/common';
import { VipPackagesController } from './vip-packages.controller';
import { VipPackagesService } from './vip-packages.service';

@Module({
  controllers: [VipPackagesController],
  providers: [VipPackagesService]
})
export class VipPackagesModule {}
