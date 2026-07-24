import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
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
        private readonly configService: ConfigService,
    ) { }

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
}