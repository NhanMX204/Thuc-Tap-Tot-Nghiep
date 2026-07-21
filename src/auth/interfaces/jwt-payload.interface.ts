import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtPayload {
    sub: number;
    email: string;
    role: UserRole;
    type: 'access';
}