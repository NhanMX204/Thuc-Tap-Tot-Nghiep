import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
    constructor(
        private readonly transactionsService: TransactionsService,
    ) { }

    @Post('create')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary:
            'Tạo giao dịch mua gói VIP',
    })
    create(
        @CurrentUser()
        user: AuthenticatedUser,

        @Body()
        dto: CreateTransactionDto,

        @Req()
        request: Request,
    ) {
        return this.transactionsService.create(
            user.id,
            dto,
            request.ip ?? '127.0.0.1',
        );
    }

    @Public()
    @Get('vnpay-return')
    @ApiOperation({
        summary:
            'Nhận kết quả chuyển hướng từ VNPay',
    })
    vnpayReturn(
        @Query()
        query: Record<string, string>,
    ) {
        return this.transactionsService.handleReturn(
            query,
        );
    }

    @Public()
    @Get('vnpay-ipn')
    @ApiOperation({
        summary:
            'Nhận IPN xác nhận thanh toán từ VNPay',
    })
    vnpayIpn(
        @Query()
        query: Record<string, string>,
    ) {
        return this.transactionsService.handleIpn(
            query,
        );
    }

    @Get('my')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary:
            'Lấy lịch sử giao dịch của tôi',
    })
    findMy(
        @CurrentUser()
        user: AuthenticatedUser,
    ) {
        return this.transactionsService.findMy(
            user.id,
        );
    }
}