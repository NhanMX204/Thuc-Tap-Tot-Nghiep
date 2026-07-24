import {
    Controller,
    Get,
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

import {
    AdminOverviewQueryDto,
    AdminTopQueryDto,
    ArticleStatsQueryDto,
    AuthorStatsQueryDto,
} from './dto';
import { StatsService } from './stats.service';

@ApiTags('Statistics')
@ApiBearerAuth('access-token')
@Controller('stats')
export class StatsController {
    constructor(
        private readonly statsService: StatsService,
    ) { }

    @Get('article')
    @Roles(
        UserRole.AUTHOR,
        UserRole.ADMIN,
    )
    @ApiOperation({
        summary:
            'Thống kê một bài viết',
    })
    getArticleStats(
        @Query()
        query: ArticleStatsQueryDto,

        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        return this.statsService
            .getArticleStats(
                query,
                user,
            );
    }

    @Get('author')
    @Roles(
        UserRole.AUTHOR,
        UserRole.ADMIN,
    )
    @ApiOperation({
        summary:
            'Thống kê tác giả',
    })
    getAuthorStats(
        @Query()
        query: AuthorStatsQueryDto,

        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        return this.statsService
            .getAuthorStats(
                query,
                user,
            );
    }

    @Get('admin/overview')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary:
            'ADMIN xem thống kê tổng quan',
    })
    getAdminOverview(
        @Query()
        query: AdminOverviewQueryDto,
    ) {
        return this.statsService
            .getAdminOverview(query);
    }

    @Get('admin/top')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary:
            'ADMIN xem bảng xếp hạng',
    })
    getAdminTop(
        @Query()
        query: AdminTopQueryDto,
    ) {
        return this.statsService
            .getAdminTop(query);
    }

    @Get('admin/authors')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary:
            'Lấy danh sách tác giả cho bộ lọc',
    })
    getAdminAuthors() {
        return this.statsService
            .getAdminAuthors();
    }
}