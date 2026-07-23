import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseEnumPipe,
    ParseIntPipe,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionTargetType } from './enums/subscription-target-type.enum';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        private readonly subscriptionsService: SubscriptionsService,
    ) { }

    @Get('my')
    @ApiOperation({
        summary:
            'Lấy danh sách đang theo dõi',
    })
    findMy(
        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        return this.subscriptionsService.findMy(
            user.id,
        );
    }

    @Post()
    @ApiOperation({
        summary:
            'Theo dõi tác giả hoặc danh mục',
    })
    create(
        @CurrentUser()
        user: AuthenticatedUser,

        @Body()
        dto: CreateSubscriptionDto,
    ) {
        return this.subscriptionsService.create(
            user,
            dto,
        );
    }

    @Delete(':targetType/:targetId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Hủy theo dõi',
    })
    remove(
        @CurrentUser()
        user: AuthenticatedUser,

        @Param(
            'targetType',
            new ParseEnumPipe(
                SubscriptionTargetType,
            ),
        )
        targetType: SubscriptionTargetType,

        @Param('targetId', ParseIntPipe)
        targetId: number,
    ) {
        return this.subscriptionsService.remove(
            user.id,
            targetType,
            targetId,
        );
    }
}