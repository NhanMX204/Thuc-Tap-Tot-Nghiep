import { Controller, Get } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService: CategoriesService,
    ) { }

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách danh mục',
    })
    @ApiOkResponse({
        description: 'Lấy danh mục thành công',
    })
    async findAll() {
        const categories =
            await this.categoriesService.findAll();

        return {
            message: 'Lấy danh mục thành công',
            data: categories,
        };
    }
}