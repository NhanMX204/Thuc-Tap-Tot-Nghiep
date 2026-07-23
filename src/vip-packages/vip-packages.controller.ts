import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
} from '@nestjs/common';
import {
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { VipPackagesService } from './vip-packages.service';

@ApiTags('VIP Packages')
@Controller('vip-packages')
export class VipPackagesController {
    constructor(
        private readonly vipPackagesService: VipPackagesService,
    ) { }

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách gói VIP đang bán',
    })
    async findAll() {
        return {
            message: 'Lấy danh sách gói VIP thành công',
            data: await this.vipPackagesService.findPublicPackages(),
        };
    }

    @Public()
    @Get(':id')
    @ApiOperation({
        summary: 'Xem chi tiết gói VIP',
    })
    async findOne(
        @Param('id', ParseIntPipe)
        id: number,
    ) {
        return {
            message: 'Lấy gói VIP thành công',
            data: await this.vipPackagesService.findPublicById(id),
        };
    }
}