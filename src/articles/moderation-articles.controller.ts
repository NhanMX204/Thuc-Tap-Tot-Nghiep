import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

import { ArticlesService } from './articles.service';
import {
    ModerationDecisionDto,
    StaffArticleQueryDto,
} from './dto';

@ApiTags('Article Moderation')
@ApiBearerAuth('access-token')
@Controller('moderation/articles')
export class ModerationArticlesController {
    constructor(
        private readonly articlesService: ArticlesService,
    ) { }

    @Get('pending')
    @Roles(UserRole.CENSOR, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Lấy danh sách bài chờ duyệt',
    })
    findPending() {
        return this.articlesService.findPendingArticles();
    }

    @Get('visibility')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary:
            'Lấy danh sách quản lý hiển thị',
    })
    findVisibility(
        @Query() query: StaffArticleQueryDto,
    ) {
        return this.articlesService.findVisibilityArticles(
            query,
        );
    }

    @Get(':articleId/visibility')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary:
            'Xem trạng thái hiển thị bài viết',
    })
    findVisibilityDetail(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.articlesService.findVisibilityDetail(
            articleId,
        );
    }

    @Get(':articleId')
    @Roles(UserRole.CENSOR, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Xem chi tiết bài kiểm duyệt',
    })
    findModerationDetail(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.articlesService.findModerationDetail(
            articleId,
        );
    }

    @Post(':articleId/decision')
    @Roles(UserRole.CENSOR, UserRole.ADMIN)
    @ApiOperation({
        summary: 'Duyệt hoặc từ chối bài viết',
    })
    makeDecision(
        @Param('articleId', ParseIntPipe)
        articleId: number,
        @Body() dto: ModerationDecisionDto,
    ) {
        return this.articlesService.makeDecision(
            articleId,
            dto,
        );
    }

    @Post(':articleId/hide')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Ẩn bài viết',
    })
    hide(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.articlesService.hide(articleId);
    }

    @Post(':articleId/show')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Hiển thị lại bài viết',
    })
    show(
        @Param('articleId', ParseIntPipe)
        articleId: number,
    ) {
        return this.articlesService.show(articleId);
    }
}