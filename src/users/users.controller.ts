import { Controller, Get } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
    @Get('me')
    @ApiOperation({
        summary:
            'Lấy thông tin tài khoản đang đăng nhập',
    })
    @ApiOkResponse({
        description:
            'Lấy thông tin tài khoản thành công',
    })
    @ApiUnauthorizedResponse({
        description:
            'Access token không hợp lệ hoặc đã hết hạn',
    })
    getMe(
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return {
            message:
                'Lấy thông tin tài khoản thành công',
            user,
        };
    }
}