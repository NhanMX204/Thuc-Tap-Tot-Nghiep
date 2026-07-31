export interface PasswordResetTokenPayload {
    sub: number;
    rid: string;
    type: 'password_reset';
}