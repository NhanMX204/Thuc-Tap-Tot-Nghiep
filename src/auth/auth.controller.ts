import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    @Public()
    @Post('register')
    @ApiOperation({
        summary: 'Đăng ký tài khoản',
    })
    @ApiCreatedResponse({
        description: 'Đăng ký thành công',
    })
    register(
        @Body() registerDto: RegisterDto,
    ) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng nhập',
    })
    async login(
        @Body() loginDto: LoginDto,
        @Req() request: Request,
        @Res({ passthrough: true })
        response: Response,
    ) {
        const result = await this.authService.login(
            loginDto,
            {
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
            },
        );

        this.setRefreshCookie(
            response,
            result.refreshToken,
        );

        const {
            refreshToken: _refreshToken,
            ...publicResult
        } = result;

        return publicResult;
    }

    @Public()
    @Post('refresh-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Cấp access token mới',
    })
    @ApiOkResponse({
        description: 'Làm mới token thành công',
    })
    async refreshToken(
        @Req() request: Request,
        @Res({ passthrough: true })
        response: Response,
    ) {
        const refreshToken =
            this.getRefreshTokenFromCookie(request);

        if (!refreshToken) {
            throw new UnauthorizedException(
                'Không tìm thấy refresh token',
            );
        }

        const result =
            await this.authService.refresh(refreshToken);

        this.setRefreshCookie(
            response,
            result.refreshToken,
        );

        const {
            refreshToken: _refreshToken,
            ...publicResult
        } = result;

        return publicResult;
    }

    @Public()
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Đăng xuất',
    })
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true })
        response: Response,
    ): Promise<void> {
        const refreshToken =
            this.getRefreshTokenFromCookie(request);

        await this.authService.logout(refreshToken);

        this.clearRefreshCookie(response);
    }

    private getRefreshTokenFromCookie(
        request: Request,
    ): string | undefined {
        const cookieName =
            this.configService.get<string>(
                'REFRESH_COOKIE_NAME',
            ) ?? 'refresh_token';

        return request.cookies?.[cookieName];
    }

    private setRefreshCookie(
        response: Response,
        refreshToken: string,
    ): void {
        const cookieName =
            this.configService.get<string>(
                'REFRESH_COOKIE_NAME',
            ) ?? 'refresh_token';

        const maxAge =
            Number(
                this.configService.get<string>(
                    'JWT_REFRESH_EXPIRES_SECONDS',
                ) ?? 604800,
            ) * 1000;

        response.cookie(
            cookieName,
            refreshToken,
            {
                httpOnly: true,
                secure:
                    this.configService.get<string>(
                        'NODE_ENV',
                    ) === 'production',
                sameSite: 'lax',
                maxAge,
                path: '/api/auth',
            },
        );
    }

    private clearRefreshCookie(
        response: Response,
    ): void {
        const cookieName =
            this.configService.get<string>(
                'REFRESH_COOKIE_NAME',
            ) ?? 'refresh_token';

        response.clearCookie(cookieName, {
            httpOnly: true,
            secure:
                this.configService.get<string>(
                    'NODE_ENV',
                ) === 'production',
            sameSite: 'lax',
            path: '/api/auth',
        });
    }
}