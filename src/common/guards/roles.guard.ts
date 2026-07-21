import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ROLES_KEY,
} from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }

    canActivate(
        context: ExecutionContext,
    ): boolean {
        const requiredRoles =
            this.reflector.getAllAndOverride<UserRole[]>(
                ROLES_KEY,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (!requiredRoles?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        const user =
            request.user as AuthenticatedUser | undefined;

        if (!user) {
            throw new ForbiddenException(
                'Không tìm thấy thông tin người dùng',
            );
        }

        const hasRole = requiredRoles.includes(
            user.role,
        );

        if (!hasRole) {
            throw new ForbiddenException(
                'Bạn không có quyền thực hiện chức năng này',
            );
        }

        return true;
    }
}