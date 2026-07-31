import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger =
        new Logger(MailService.name);

    private readonly transporter: Transporter;

    constructor(
        private readonly configService: ConfigService,
    ) {
        this.transporter =
            nodemailer.createTransport({
                host: this.getRequiredConfig(
                    'MAIL_HOST',
                ),

                port: Number(
                    this.getRequiredConfig(
                        'MAIL_PORT',
                    ),
                ),

                secure:
                    this.configService.get<string>(
                        'MAIL_SECURE',
                    ) === 'true',

                auth: {
                    user: this.getRequiredConfig(
                        'MAIL_USER',
                    ),

                    pass: this.getRequiredConfig(
                        'MAIL_PASSWORD',
                    ),
                },
            });
    }

    async sendPasswordResetCode(
        email: string,
        name: string,
        code: string,
    ): Promise<void> {
        const fromAddress =
            this.getRequiredConfig(
                'MAIL_FROM_ADDRESS',
            );

        const fromName =
            this.configService.get<string>(
                'MAIL_FROM_NAME',
            ) ?? 'Báo điện tử';

        try {
            await this.transporter.sendMail({
                from: {
                    name: fromName,
                    address: fromAddress,
                },

                to: email,

                subject:
                    'Mã xác nhận đặt lại mật khẩu',

                text:
                    `Xin chào ${name},\n\n` +
                    `Mã xác nhận đặt lại mật khẩu của bạn là: ${code}\n\n` +
                    `Mã có hiệu lực trong 10 phút.\n` +
                    `Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.`,

                html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Đặt lại mật khẩu</h2>

            <p>Xin chào <strong>${this.escapeHtml(name)}</strong>,</p>

            <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>

            <div style="
              font-size:32px;
              font-weight:bold;
              letter-spacing:8px;
              padding:18px;
              text-align:center;
              background:#f1f3f5;
              border-radius:8px;
            ">
              ${code}
            </div>

            <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>

            <p>
              Nếu bạn không yêu cầu đổi mật khẩu,
              hãy bỏ qua email này.
            </p>
          </div>
        `,
            });
        } catch (error) {
            this.logger.error(
                `Gửi email đặt lại mật khẩu thất bại tới ${email}`,
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            throw new InternalServerErrorException(
                'Không thể gửi email xác nhận',
            );
        }
    }

    private getRequiredConfig(
        key: string,
    ): string {
        const value =
            this.configService.get<string>(key);

        if (!value) {
            throw new Error(
                `${key} chưa được cấu hình trong .env`,
            );
        }

        return value;
    }

    private escapeHtml(
        value: string,
    ): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}