import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Put,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateVipPackageDto } from './dto/update-vip-package.dto';
import { VipPackagesService } from './vip-packages.service';

@ApiTags('Admin VIP Packages')
@ApiBearerAuth('access-token')
@Controller('admin/vip-packages')
@Roles(UserRole.ADMIN)
export class AdminVipPackagesController {
    constructor(
        private readonly vipPackagesService: VipPackagesService,
    ) { }

    @Get()
    @ApiOperation({
        summary: 'ADMIN lấy toàn bộ gói VIP',
    })
    async findAll() {
        return {
            message: 'Lấy danh sách gói VIP thành công',
            data: await this.vipPackagesService.findAllForAdmin(),
        };
    }

    @Get(':id')
    @ApiOperation({
        summary: 'ADMIN xem chi tiết gói VIP',
    })
    async findOne(
        @Param('id', ParseIntPipe)
        id: number,
    ) {
        return {
            message: 'Lấy gói VIP thành công',
            data: await this.vipPackagesService.findAdminById(id),
        };
    }

    @Put(':id')
    @ApiOperation({
        summary: 'ADMIN cập nhật gói VIP',
    })
    update(
        @Param('id', ParseIntPipe)
        id: number,

        @Body()
        dto: UpdateVipPackageDto,
    ) {
        return this.vipPackagesService.update(id, dto);
    }
}