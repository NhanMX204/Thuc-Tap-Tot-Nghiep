import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { decimalNumberTransformer } from '../../common/database/decimal-number.transformer';
import { User } from '../../users/entities/user.entity';
import { VipPackage } from '../../vip-packages/entities/vip-package.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Entity('transactions')
@Index('UQ_TRANSACTION_CODE', ['transactionCode'], {
    unique: true,
})
@Index('IDX_TRANSACTIONS_USER_CREATED', [
    'userId',
    'createdAt',
])
@Index('IDX_TRANSACTIONS_STATUS', ['status'])
export class VipTransaction {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        name: 'transaction_code',
        type: 'varchar',
        length: 100,
        unique: true,
    })
    transactionCode!: string;

    @Column({
        name: 'user_id',
        type: 'int',
    })
    userId!: number;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({
        name: 'user_id',
    })
    user!: User;

    @Column({
        name: 'package_id',
        type: 'int',
    })
    packageId!: number;

    @ManyToOne(() => VipPackage, {
        nullable: false,
        onDelete: 'RESTRICT',
    })
    @JoinColumn({
        name: 'package_id',
    })
    vipPackage!: VipPackage;

    @Column({
        name: 'package_name',
        type: 'varchar',
        length: 150,
    })
    packageName!: string;

    @Column({
        name: 'package_duration_days',
        type: 'int',
    })
    packageDurationDays!: number;

    @Column({
        name: 'original_price',
        type: 'decimal',
        precision: 15,
        scale: 0,
        transformer: decimalNumberTransformer,
    })
    originalPrice!: number;

    @Column({
        name: 'discount_percent',
        type: 'decimal',
        precision: 5,
        scale: 2,
        transformer: decimalNumberTransformer,
    })
    discountPercent!: number;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 0,
        transformer: decimalNumberTransformer,
    })
    amount!: number;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.VNPAY,
    })
    paymentMethod!: PaymentMethod;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING,
    })
    status!: TransactionStatus;

    @Column({
        name: 'vnp_transaction_no',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    vnpTransactionNo!: string | null;

    @Column({
        name: 'vnp_bank_code',
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    vnpBankCode!: string | null;

    @Column({
        name: 'vnp_bank_transaction_no',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    vnpBankTransactionNo!: string | null;

    @Column({
        name: 'vnp_response_code',
        type: 'varchar',
        length: 10,
        nullable: true,
    })
    vnpResponseCode!: string | null;

    @Column({
        name: 'vnp_transaction_status',
        type: 'varchar',
        length: 10,
        nullable: true,
    })
    vnpTransactionStatus!: string | null;

    @Column({
        name: 'order_info',
        type: 'varchar',
        length: 255,
    })
    orderInfo!: string;

    @Column({
        name: 'paid_at',
        type: 'datetime',
        nullable: true,
    })
    paidAt!: Date | null;

    @Column({
        name: 'expires_at',
        type: 'datetime',
    })
    expiresAt!: Date;

    @CreateDateColumn({
        name: 'created_at',
        type: 'datetime',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'datetime',
    })
    updatedAt!: Date;
}