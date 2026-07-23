import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import {
    OPTIONAL_AUTH_KEY,
} from '../decorators/optional-auth.decorator';
import {
    IS_PUBLIC_KEY,
} from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
    ) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic =
            this.reflector.getAllAndOverride<boolean>(
                IS_PUBLIC_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest<TUser = any>(
        error: any,
        user: any,
        _info: any,
        context: ExecutionContext,
    ): TUser {
        const optionalAuth =
            this.reflector.getAllAndOverride<boolean>(
                OPTIONAL_AUTH_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (optionalAuth && !user) {
            return null as TUser;
        }

        if (error || !user) {
            throw (
                error ??
                new UnauthorizedException(
                    'Access token không hợp lệ hoặc đã hết hạn',
                )
            );
        }

        return user as TUser;
    }
}