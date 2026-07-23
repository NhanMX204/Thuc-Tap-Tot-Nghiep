import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

import { ArticlesService } from './articles.service';
import {
    CreateArticleDto,
    StaffArticleQueryDto,
    UpdateArticleDto,
} from './dto';

@ApiTags('Staff Articles')
@ApiBearerAuth('access-token')
@Controller('staff/articles')
export class StaffArticlesController {
    constructor(
        private readonly articlesService: ArticlesService,
    ) { }

    @Get()
    @Roles(UserRole.AUTHOR, UserRole.ADMIN)
    @ApiOperation({
        summary:
            'Lấy danh sách bài viết được quản lý',
    })
    findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: StaffArticleQueryDto,
    ) {
        return this.articlesService.findStaffArticles(
            user,
            query,
        );
    }

    @Get(':articleId')
    @Roles(UserRole.AUTHOR, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Lấy chi tiết bài viết',
    })
    findOne(
        @Param('articleId', ParseIntPipe)
        articleId: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.articlesService.findStaffArticleDetail(
            articleId,
            user,
        );
    }

    @Post('create')
    @Roles(UserRole.AUTHOR)
    @ApiOperation({
        summary: 'Tác giả tạo bài viết',
    })
    create(
        @Body() dto: CreateArticleDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.articlesService.create(
            user,
            dto,
        );
    }

    @Put(':articleId')
    @Roles(UserRole.AUTHOR, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Cập nhật bài viết',
    })
    update(
        @Param('articleId', ParseIntPipe)
        articleId: number,
        @Body() dto: UpdateArticleDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.articlesService.update(
            articleId,
            user,
            dto,
        );
    }
}