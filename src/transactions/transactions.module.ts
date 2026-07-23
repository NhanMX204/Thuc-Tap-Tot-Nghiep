import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VipPackagesModule } from '../vip-packages/vip-packages.module';
import { VipTransaction } from './entities/vip-transaction.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { VnpayService } from './vnpay.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VipTransaction,
    ]),
    VipPackagesModule,
  ],
  controllers: [
    TransactionsController,
  ],
  providers: [
    TransactionsService,
    VnpayService,
  ],
  exports: [
    TransactionsService,
  ],
})
export class TransactionsModule { }