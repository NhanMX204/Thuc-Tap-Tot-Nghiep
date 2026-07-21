export interface RefreshTokenPayload {
    sub: number;
    sid: string;
    jti: string;
    type: 'refresh';
}