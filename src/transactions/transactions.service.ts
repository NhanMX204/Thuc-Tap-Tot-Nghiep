import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    DataSource,
    LessThan,
    Repository,
} from 'typeorm';

import { User } from '../users/entities/user.entity';
import { VipPackagesService } from '../vip-packages/vip-packages.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { VipTransaction } from './entities/vip-transaction.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { VnpayService } from './vnpay.service';

export interface IpnResponse {
    RspCode: string;
    Message: string;
}

@Injectable()
export class TransactionsService {
    private readonly logger =
        new Logger(TransactionsService.name);

    constructor(
        @InjectRepository(VipTransaction)
        private readonly transactionRepository: Repository<VipTransaction>,

        private readonly dataSource: DataSource,

        private readonly vipPackagesService: VipPackagesService,

        private readonly vnpayService: VnpayService,
    ) { }

    async create(
        userId: number,
        dto: CreateTransactionDto,
        ipAddress: string,
    ) {
        const vipPackage =
            await this.vipPackagesService.findActiveById(
                dto.packageId,
            );

        const finalAmount = Math.round(
            vipPackage.price *
            (1 -
                vipPackage.discountPercent /
                100),
        );

        const transactionCode =
            this.createTransactionCode();

        const expireMinutes = Number(
            process.env
                .VNPAY_PAYMENT_EXPIRE_MINUTES ??
            15,
        );

        const expiresAt = new Date(
            Date.now() +
            expireMinutes * 60 * 1000,
        );

        const orderInfo =
            `Thanh toan goi ${vipPackage.name} ` +
            `ma ${transactionCode}`;

        const transaction =
            this.transactionRepository.create({
                transactionCode,
                userId,
                packageId: vipPackage.id,

                packageName: vipPackage.name,
                packageDurationDays:
                    vipPackage.durationDays,

                originalPrice: vipPackage.price,
                discountPercent:
                    vipPackage.discountPercent,
                amount: finalAmount,

                paymentMethod:
                    PaymentMethod.VNPAY,

                status:
                    TransactionStatus.PENDING,

                vnpTransactionNo: null,
                vnpBankCode: null,
                vnpBankTransactionNo: null,
                vnpResponseCode: null,
                vnpTransactionStatus: null,

                orderInfo,
                paidAt: null,
                expiresAt,
            });

        const savedTransaction =
            await this.transactionRepository.save(
                transaction,
            );

        const paymentUrl =
            this.vnpayService.createPaymentUrl({
                transactionCode:
                    savedTransaction.transactionCode,
                amount:
                    savedTransaction.amount,
                orderInfo:
                    savedTransaction.orderInfo,
                ipAddress,
                expiresAt,
            });

        return {
            message:
                'Tạo giao dịch thành công',
            transaction: this.toResponse(
                savedTransaction,
            ),
            paymentUrl,
        };
    }

    async findMy(userId: number) {
        /*
         * Đánh dấu giao dịch chờ nhưng đã quá hạn.
         */
        await this.transactionRepository.update(
            {
                userId,
                status:
                    TransactionStatus.PENDING,
                expiresAt: LessThan(new Date()),
            },
            {
                status:
                    TransactionStatus.EXPIRED,
            },
        );

        const transactions =
            await this.transactionRepository.find({
                where: {
                    userId,
                },
                order: {
                    createdAt: 'DESC',
                },
            });

        return {
            message:
                'Lấy lịch sử giao dịch thành công',
            data: transactions.map(
                (transaction) =>
                    this.toResponse(transaction),
            ),
        };
    }

    async handleReturn(
        query: Record<string, string>,
    ) {
        const validSignature =
            this.vnpayService.verifyCallback(
                query,
            );

        const transaction =
            query.vnp_TxnRef
                ? await this.transactionRepository.findOne({
                    where: {
                        transactionCode:
                            query.vnp_TxnRef,
                    },
                })
                : null;

        return {
            message: validSignature
                ? 'Đã nhận kết quả từ VNPay'
                : 'Chữ ký VNPay không hợp lệ',

            validSignature,

            paymentSuccessful:
                validSignature &&
                query.vnp_ResponseCode ===
                '00' &&
                query.vnp_TransactionStatus ===
                '00',

            responseCode:
                query.vnp_ResponseCode ??
                null,

            transactionStatus:
                transaction?.status ?? null,

            transaction:
                transaction
                    ? this.toResponse(transaction)
                    : null,
        };
    }

    async handleIpn(
        query: Record<string, string>,
    ): Promise<IpnResponse> {
        try {
            if (
                !this.vnpayService.verifyCallback(
                    query,
                )
            ) {
                return {
                    RspCode: '97',
                    Message: 'Invalid Signature',
                };
            }

            const transactionCode =
                query.vnp_TxnRef;

            if (!transactionCode) {
                return {
                    RspCode: '01',
                    Message: 'Order Not Found',
                };
            }

            return await this.dataSource.transaction(
                async (manager) => {
                    /*
                     * Khóa bản ghi để tránh hai IPN
                     * xử lý cùng một giao dịch.
                     */
                    const transaction =
                        await manager.findOne(
                            VipTransaction,
                            {
                                where: {
                                    transactionCode,
                                },
                                lock: {
                                    mode: 'pessimistic_write',
                                },
                            },
                        );

                    if (!transaction) {
                        return {
                            RspCode: '01',
                            Message: 'Order Not Found',
                        };
                    }

                    const callbackAmount =
                        Number(
                            query.vnp_Amount ?? 0,
                        ) / 100;

                    if (
                        Math.round(callbackAmount) !==
                        Math.round(
                            transaction.amount,
                        )
                    ) {
                        return {
                            RspCode: '04',
                            Message: 'Invalid Amount',
                        };
                    }

                    if (
                        transaction.status !==
                        TransactionStatus.PENDING
                    ) {
                        return {
                            RspCode: '02',
                            Message:
                                'Order Already Updated',
                        };
                    }

                    transaction.vnpTransactionNo =
                        query.vnp_TransactionNo ??
                        null;

                    transaction.vnpBankCode =
                        query.vnp_BankCode ?? null;

                    transaction.vnpBankTransactionNo =
                        query.vnp_BankTranNo ??
                        null;

                    transaction.vnpResponseCode =
                        query.vnp_ResponseCode ??
                        null;

                    transaction.vnpTransactionStatus =
                        query.vnp_TransactionStatus ??
                        null;

                    const isSuccessful =
                        query.vnp_ResponseCode ===
                        '00' &&
                        query.vnp_TransactionStatus ===
                        '00';

                    if (isSuccessful) {
                        transaction.status =
                            TransactionStatus.SUCCESS;

                        transaction.paidAt =
                            this.vnpayService.parseVnpayDate(
                                query.vnp_PayDate,
                            ) ?? new Date();

                        const user =
                            await manager.findOne(User, {
                                where: {
                                    id: transaction.userId,
                                },
                                lock: {
                                    mode:
                                        'pessimistic_write',
                                },
                            });

                        if (!user) {
                            return {
                                RspCode: '01',
                                Message:
                                    'User Not Found',
                            };
                        }

                        const now = new Date();

                        const vipStartDate =
                            user.vipExpiredAt &&
                                user.vipExpiredAt > now
                                ? user.vipExpiredAt
                                : now;

                        user.vipExpiredAt =
                            this.addDays(
                                vipStartDate,
                                transaction.packageDurationDays,
                            );

                        await manager.save(User, user);
                    } else {
                        transaction.status =
                            query.vnp_ResponseCode ===
                                '24'
                                ? TransactionStatus.CANCELLED
                                : TransactionStatus.FAILED;
                    }

                    await manager.save(
                        VipTransaction,
                        transaction,
                    );

                    return {
                        RspCode: '00',
                        Message: 'Confirm Success',
                    };
                },
            );
        } catch (error) {
            this.logger.error(
                'Xử lý VNPay IPN thất bại',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            return {
                RspCode: '99',
                Message: 'Unknown Error',
            };
        }
    }

    private addDays(
        date: Date,
        days: number,
    ): Date {
        const result = new Date(date);

        result.setDate(
            result.getDate() + days,
        );

        return result;
    }

    private createTransactionCode(): string {
        const randomPart = Math.floor(
            100000 + Math.random() * 900000,
        );

        return (
            `VIP${Date.now()}` +
            `${randomPart}`
        );
    }

    private toResponse(
        transaction: VipTransaction,
    ) {
        return {
            id: transaction.id,
            transactionCode:
                transaction.transactionCode,

            package: {
                id: transaction.packageId,
                name: transaction.packageName,
                durationDays:
                    transaction.packageDurationDays,
            },

            originalPrice:
                transaction.originalPrice,

            discountPercent:
                transaction.discountPercent,

            amount: transaction.amount,

            paymentMethod:
                transaction.paymentMethod,

            status: transaction.status,

            vnpTransactionNo:
                transaction.vnpTransactionNo,

            vnpBankCode:
                transaction.vnpBankCode,

            vnpResponseCode:
                transaction.vnpResponseCode,

            paidAt: transaction.paidAt,
            expiresAt: transaction.expiresAt,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
        };
    }
}