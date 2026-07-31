import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PasswordResetsService } from '../password-resets/password-resets.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { PasswordResetTokenPayload } from './interfaces/password-reset-token-payload.interface';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UserStatus } from '../common/enums/user-status.enum';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenPayload } from './interfaces/refresh-token-payload.interface';

interface LoginMetadata {
    userAgent?: string;
    ipAddress?: string;
}

@Injectable()
export class AuthService {
    private readonly bcryptSaltRounds = 12;

    constructor(
        private readonly usersService: UsersService,
        private readonly sessionsService: SessionsService,
        private readonly jwtService: JwtService,
        private readonly passwordResetsService: PasswordResetsService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
    ) { }


    async forgotPassword(
        dto: ForgotPasswordDto,
        requestIp?: string,
    ) {
        const genericResponse = {
            message:
                'Nếu email tồn tại trong hệ thống, mã xác nhận sẽ được gửi tới email đó',
        };

        const email =
            dto.email.trim().toLowerCase();

        const user =
            await this.usersService.findByEmail(
                email,
            );

        /*
         * Không thông báo email có tồn tại hay không,
         * tránh dò tìm tài khoản.
         */
        if (!user) {
            /*
             * Tạo một phép hash giả để giảm khác biệt
             * thời gian phản hồi.
             */
            await bcrypt.hash(
                String(
                    randomInt(
                        100000,
                        1000000,
                    ),
                ),
                10,
            );

            return genericResponse;
        }

        const canCreateRequest =
            await this.passwordResetsService
                .canCreateRequest(user.id);

        /*
         * Nếu gửi lại quá nhanh vẫn trả response chung,
         * không tạo thêm email.
         */
        if (!canCreateRequest) {
            return genericResponse;
        }

        const code = String(
            randomInt(100000, 1000000),
        );

        const codeHash =
            await bcrypt.hash(code, 10);

        await this.passwordResetsService.create({
            userId: user.id,
            codeHash,
            requestIp,
        });

        try {
            await this.mailService
                .sendPasswordResetCode(
                    user.email,
                    user.name,
                    code,
                );
        } catch {
            await this.passwordResetsService
                .invalidateOpenRequests(
                    user.id,
                );

            throw new ServiceUnavailableException(
                'Không thể gửi email xác nhận. Vui lòng thử lại sau',
            );
        }

        return genericResponse;
    }

    async verifyPasswordResetCode(
        dto: VerifyResetCodeDto,
    ) {
        const user =
            await this.usersService.findByEmail(
                dto.email.trim().toLowerCase(),
            );

        if (!user) {
            throw new UnauthorizedException(
                'Mã xác nhận không hợp lệ hoặc đã hết hạn',
            );
        }

        const resetRequest =
            await this.passwordResetsService
                .verifyCode(
                    user.id,
                    dto.code,
                );

        const payload: PasswordResetTokenPayload = {
            sub: user.id,
            rid: resetRequest.id,
            type: 'password_reset',
        };

        const expiresIn = Number(
            this.configService.get<string>(
                'PASSWORD_RESET_TOKEN_EXPIRES_SECONDS',
            ) ?? 600,
        );

        const resetToken =
            await this.jwtService.signAsync(
                payload,
                {
                    secret:
                        this.getPasswordResetSecret(),
                    expiresIn,
                },
            );

        return {
            message:
                'Xác nhận mã thành công',
            resetToken,
            expiresIn,
        };
    }

    async resetPassword(
        dto: ResetPasswordDto,
    ) {
        if (
            dto.newPassword !==
            dto.confirmation
        ) {
            throw new BadRequestException(
                'Mật khẩu xác nhận không khớp',
            );
        }

        const payload =
            await this.verifyPasswordResetToken(
                dto.resetToken,
            );

        const passwordHash =
            await bcrypt.hash(
                dto.newPassword,
                12,
            );

        await this.passwordResetsService
            .consumeAndChangePassword(
                payload.rid,
                payload.sub,
                passwordHash,
            );

        /*
         * Thu hồi refresh token của tất cả thiết bị.
         */
        await this.sessionsService
            .revokeAllByUserId(
                payload.sub,
            );

        return {
            message:
                'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại',
        };
    }

    async register(registerDto: RegisterDto) {
        const { name, email, password, confirmation, role } =
            registerDto;

        if (password !== confirmation) {
            throw new BadRequestException(
                'Mật khẩu xác nhận không khớp',
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailExists =
            await this.usersService.emailExists(normalizedEmail);

        if (emailExists) {
            throw new ConflictException(
                'Email đã được sử dụng',
            );
        }

        const passwordHash = await bcrypt.hash(
            password,
            this.bcryptSaltRounds,
        );

        const user = await this.usersService.create({
            name,
            email: normalizedEmail,
            passwordHash,
            role,
        });

        return {
            message: 'Đăng ký tài khoản thành công',
            user: this.toPublicUser(user),
        };
    }

    async login(
        loginDto: LoginDto,
        metadata: LoginMetadata,
    ) {
        const email = loginDto.email.trim().toLowerCase();

        const user =
            await this.usersService.findByEmailWithPassword(
                email,
            );

        if (!user) {
            throw new UnauthorizedException(
                'Email hoặc mật khẩu không chính xác',
            );
        }

        const passwordMatches = await bcrypt.compare(
            loginDto.password,
            user.passwordHash,
        );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Email hoặc mật khẩu không chính xác',
            );
        }

        this.ensureUserCanLogin(user);

        const sessionId = randomUUID();

        const accessToken =
            await this.createAccessToken(user);

        const refreshToken =
            await this.createRefreshToken(
                user,
                sessionId,
            );

        const refreshTokenHash = await bcrypt.hash(
            refreshToken,
            this.bcryptSaltRounds,
        );

        await this.sessionsService.create({
            id: sessionId,
            userId: user.id,
            refreshTokenHash,
            expiresAt: this.createRefreshExpirationDate(),
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress,
        });

        return {
            message: 'Đăng nhập thành công',
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.getAccessExpiresSeconds(),
            user: this.toPublicUser(user),
        };
    }

    async refresh(refreshToken: string) {
        const payload =
            await this.verifyRefreshToken(refreshToken);

        const session =
            await this.sessionsService.findActiveWithTokenHash(
                payload.sid,
            );

        if (!session) {
            throw new UnauthorizedException(
                'Phiên đăng nhập không tồn tại hoặc đã hết hạn',
            );
        }

        if (session.userId !== payload.sub) {
            await this.sessionsService.revoke(session.id);

            throw new UnauthorizedException(
                'Refresh token không hợp lệ',
            );
        }

        const refreshTokenMatches = await bcrypt.compare(
            refreshToken,
            session.refreshTokenHash,
        );

        if (!refreshTokenMatches) {
            await this.sessionsService.revoke(session.id);

            throw new UnauthorizedException(
                'Refresh token đã được sử dụng hoặc bị thay thế',
            );
        }

        const user = session.user;

        this.ensureUserCanLogin(user);

        const newAccessToken =
            await this.createAccessToken(user);

        const newRefreshToken =
            await this.createRefreshToken(
                user,
                session.id,
            );

        const newRefreshTokenHash = await bcrypt.hash(
            newRefreshToken,
            this.bcryptSaltRounds,
        );

        await this.sessionsService.rotateRefreshToken(
            session.id,
            newRefreshTokenHash,
            this.createRefreshExpirationDate(),
        );

        return {
            message: 'Làm mới token thành công',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenType: 'Bearer',
            expiresIn: this.getAccessExpiresSeconds(),
        };
    }

    async logout(
        refreshToken: string | undefined,
    ): Promise<void> {
        if (!refreshToken) {
            return;
        }

        try {
            const payload =
                await this.verifyRefreshToken(refreshToken);

            await this.sessionsService.revoke(
                payload.sid,
            );
        } catch {
            // Cookie vẫn được xóa tại controller.
            // Logout không cần trả lỗi khi token đã hết hạn.
        }
    }

    private async createAccessToken(
        user: User,
    ): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            type: 'access',
        };

        return this.jwtService.signAsync(payload, {
            secret: this.getAccessSecret(),
            expiresIn: this.getAccessExpiresSeconds(),
        });
    }

    private async createRefreshToken(
        user: User,
        sessionId: string,
    ): Promise<string> {
        const payload: RefreshTokenPayload = {
            sub: user.id,
            sid: sessionId,
            jti: randomUUID(),
            type: 'refresh',
        };

        return this.jwtService.signAsync(payload, {
            secret: this.getRefreshSecret(),
            expiresIn: this.getRefreshExpiresSeconds(),
        });
    }

    private async verifyRefreshToken(
        refreshToken: string,
    ): Promise<RefreshTokenPayload> {
        try {
            const payload =
                await this.jwtService.verifyAsync<RefreshTokenPayload>(
                    refreshToken,
                    {
                        secret: this.getRefreshSecret(),
                    },
                );

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException();
            }

            return payload;
        } catch {
            throw new UnauthorizedException(
                'Refresh token không hợp lệ hoặc đã hết hạn',
            );
        }
    }

    private ensureUserCanLogin(user: User): void {
        if (user.status === UserStatus.BLOCKED) {
            throw new ForbiddenException(
                'Tài khoản đã bị khóa',
            );
        }
    }

    private getAccessSecret(): string {
        const secret =
            this.configService.get<string>(
                'JWT_ACCESS_SECRET',
            );

        if (!secret) {
            throw new Error(
                'JWT_ACCESS_SECRET chưa được cấu hình',
            );
        }

        return secret;
    }

    private getRefreshSecret(): string {
        const secret =
            this.configService.get<string>(
                'JWT_REFRESH_SECRET',
            );

        if (!secret) {
            throw new Error(
                'JWT_REFRESH_SECRET chưa được cấu hình',
            );
        }

        return secret;
    }

    private getAccessExpiresSeconds(): number {
        return Number(
            this.configService.get<string>(
                'JWT_ACCESS_EXPIRES_SECONDS',
            ) ?? 900,
        );
    }

    private getRefreshExpiresSeconds(): number {
        return Number(
            this.configService.get<string>(
                'JWT_REFRESH_EXPIRES_SECONDS',
            ) ?? 604800,
        );
    }

    private createRefreshExpirationDate(): Date {
        return new Date(
            Date.now() +
            this.getRefreshExpiresSeconds() * 1000,
        );
    }

    private toPublicUser(user: User) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            vipExpiredAt: user.vipExpiredAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private getPasswordResetSecret(): string {
        const secret =
            this.configService.get<string>(
                'PASSWORD_RESET_TOKEN_SECRET',
            );

        if (!secret) {
            throw new Error(
                'PASSWORD_RESET_TOKEN_SECRET chưa được cấu hình',
            );
        }

        return secret;
    }

    private async verifyPasswordResetToken(
        token: string,
    ): Promise<PasswordResetTokenPayload> {
        try {
            const payload =
                await this.jwtService
                    .verifyAsync<PasswordResetTokenPayload>(
                        token,
                        {
                            secret:
                                this.getPasswordResetSecret(),
                        },
                    );

            if (
                payload.type !==
                'password_reset'
            ) {
                throw new Error(
                    'Invalid token type',
                );
            }

            return payload;
        } catch {
            throw new UnauthorizedException(
                'Reset token không hợp lệ hoặc đã hết hạn',
            );
        }
    }
}