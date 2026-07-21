import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    ExtractJwt,
    Strategy,
} from 'passport-jwt';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
    'jwt',
) {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        const secret =
            configService.get<string>(
                'JWT_ACCESS_SECRET',
            );

        if (!secret) {
            throw new Error(
                'JWT_ACCESS_SECRET chưa được cấu hình',
            );
        }

        super({
            jwtFromRequest:
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(
        payload: JwtPayload,
    ): Promise<AuthenticatedUser> {
        if (payload.type !== 'access') {
            throw new UnauthorizedException(
                'Token không phải access token',
            );
        }

        const user =
            await this.usersService.findById(
                payload.sub,
            );

        if (!user) {
            throw new UnauthorizedException(
                'Tài khoản không tồn tại',
            );
        }

        if (user.status === UserStatus.BLOCKED) {
            throw new UnauthorizedException(
                'Tài khoản đã bị khóa',
            );
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            vipExpiredAt: user.vipExpiredAt,
        };
    }
}