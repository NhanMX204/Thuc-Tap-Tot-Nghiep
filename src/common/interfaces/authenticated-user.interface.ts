import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export interface AuthenticatedUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    vipExpiredAt: Date | null;
}