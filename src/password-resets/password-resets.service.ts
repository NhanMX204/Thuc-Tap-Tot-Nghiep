import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import {
    DataSource,
    Repository,
} from 'typeorm';

import { User } from '../users/entities/user.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity';

interface CreatePasswordResetRequestData {
    userId: number;
    codeHash: string;
    requestIp?: string;
}

@Injectable()
export class PasswordResetsService {
    constructor(
        @InjectRepository(PasswordResetRequest)
        private readonly passwordResetRepository: Repository<PasswordResetRequest>,

        private readonly dataSource: DataSource,

        private readonly configService: ConfigService,
    ) { }

    async canCreateRequest(
        userId: number,
    ): Promise<boolean> {
        const latestRequest =
            await this.passwordResetRepository.findOne({
                where: {
                    userId,
                },
                order: {
                    createdAt: 'DESC',
                },
            });

        if (!latestRequest) {
            return true;
        }

        const resendSeconds = Number(
            this.configService.get<string>(
                'PASSWORD_RESET_RESEND_SECONDS',
            ) ?? 60,
        );

        const nextAllowedTime =
            latestRequest.createdAt.getTime() +
            resendSeconds * 1000;

        return Date.now() >= nextAllowedTime;
    }

    async create(
        data: CreatePasswordResetRequestData,
    ): Promise<PasswordResetRequest> {
        /*
         * Vô hiệu hóa tất cả mã cũ chưa sử dụng.
         */
        await this.invalidateOpenRequests(
            data.userId,
        );

        const expiresSeconds = Number(
            this.configService.get<string>(
                'PASSWORD_RESET_CODE_EXPIRES_SECONDS',
            ) ?? 600,
        );

        const request =
            this.passwordResetRepository.create({
                userId: data.userId,
                codeHash: data.codeHash,
                attempts: 0,
                expiresAt: new Date(
                    Date.now() +
                    expiresSeconds * 1000,
                ),
                verifiedAt: null,
                consumedAt: null,
                requestIp:
                    data.requestIp ?? null,
            });

        return this.passwordResetRepository.save(
            request,
        );
    }

    async verifyCode(
        userId: number,
        code: string,
    ): Promise<PasswordResetRequest> {
        const request =
            await this.passwordResetRepository
                .createQueryBuilder('resetRequest')
                .addSelect(
                    'resetRequest.codeHash',
                )
                .where(
                    'resetRequest.user_id = :userId',
                    {
                        userId,
                    },
                )
                .andWhere(
                    'resetRequest.consumed_at IS NULL',
                )
                .andWhere(
                    'resetRequest.verified_at IS NULL',
                )
                .andWhere(
                    'resetRequest.expires_at > :now',
                    {
                        now: new Date(),
                    },
                )
                .orderBy(
                    'resetRequest.created_at',
                    'DESC',
                )
                .getOne();

        if (!request) {
            throw new UnauthorizedException(
                'Mã xác nhận không hợp lệ hoặc đã hết hạn',
            );
        }

        const maxAttempts = Number(
            this.configService.get<string>(
                'PASSWORD_RESET_MAX_ATTEMPTS',
            ) ?? 5,
        );

        if (request.attempts >= maxAttempts) {
            request.consumedAt = new Date();

            await this.passwordResetRepository.save(
                request,
            );

            throw new UnauthorizedException(
                'Mã xác nhận đã bị khóa do nhập sai quá nhiều lần',
            );
        }

        const codeMatches = await bcrypt.compare(
            code,
            request.codeHash,
        );

        if (!codeMatches) {
            request.attempts += 1;

            if (
                request.attempts >= maxAttempts
            ) {
                request.consumedAt = new Date();
            }

            await this.passwordResetRepository.save(
                request,
            );

            throw new UnauthorizedException(
                'Mã xác nhận không hợp lệ hoặc đã hết hạn',
            );
        }

        request.verifiedAt = new Date();

        await this.passwordResetRepository.save(
            request,
        );

        return request;
    }

    async consumeAndChangePassword(
        requestId: string,
        userId: number,
        passwordHash: string,
    ): Promise<void> {
        await this.dataSource.transaction(
            async (manager) => {
                const resetRepository =
                    manager.getRepository(
                        PasswordResetRequest,
                    );

                const userRepository =
                    manager.getRepository(User);

                const resetRequest =
                    await resetRepository.findOne({
                        where: {
                            id: requestId,
                        },
                        lock: {
                            mode: 'pessimistic_write',
                        },
                    });

                if (
                    !resetRequest ||
                    resetRequest.userId !== userId ||
                    !resetRequest.verifiedAt ||
                    resetRequest.consumedAt ||
                    resetRequest.expiresAt <=
                    new Date()
                ) {
                    throw new UnauthorizedException(
                        'Yêu cầu đổi mật khẩu không hợp lệ hoặc đã hết hạn',
                    );
                }

                const user =
                    await userRepository.findOne({
                        where: {
                            id: userId,
                        },
                        lock: {
                            mode: 'pessimistic_write',
                        },
                    });

                if (!user) {
                    throw new UnauthorizedException(
                        'Tài khoản không tồn tại',
                    );
                }

                await userRepository.update(
                    {
                        id: userId,
                    },
                    {
                        passwordHash,
                    },
                );

                resetRequest.consumedAt =
                    new Date();

                await resetRepository.save(
                    resetRequest,
                );
            },
        );
    }

    async invalidateOpenRequests(
        userId: number,
    ): Promise<void> {
        await this.passwordResetRepository
            .createQueryBuilder()
            .update(PasswordResetRequest)
            .set({
                consumedAt: new Date(),
            })
            .where('user_id = :userId', {
                userId,
            })
            .andWhere('consumed_at IS NULL')
            .execute();
    }
}