import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    createHmac,
    timingSafeEqual,
} from 'crypto';

interface CreateVnpayUrlInput {
    transactionCode: string;
    amount: number;
    orderInfo: string;
    ipAddress: string;
    expiresAt: Date;
}

@Injectable()
export class VnpayService {
    constructor(
        private readonly configService: ConfigService,
    ) { }

    createPaymentUrl(
        input: CreateVnpayUrlInput,
    ): string {
        const paymentUrl = this.getRequiredConfig(
            'VNPAY_PAYMENT_URL',
        );

        const tmnCode = this.getRequiredConfig(
            'VNPAY_TMN_CODE',
        );

        const returnUrl = this.getRequiredConfig(
            'VNPAY_RETURN_URL',
        );

        const now = new Date();

        const params: Record<string, string> = {
            vnp_Version:
                this.configService.get<string>(
                    'VNPAY_VERSION',
                ) ?? '2.1.0',

            vnp_Command: 'pay',

            vnp_TmnCode: tmnCode,

            /*
             * VNPay yêu cầu số tiền nhân 100.
             */
            vnp_Amount: String(
                Math.round(input.amount * 100),
            ),

            vnp_CurrCode: 'VND',

            vnp_TxnRef: input.transactionCode,

            vnp_OrderInfo: this.normalizeOrderInfo(
                input.orderInfo,
            ),

            vnp_OrderType:
                this.configService.get<string>(
                    'VNPAY_ORDER_TYPE',
                ) ?? 'other',

            vnp_Locale:
                this.configService.get<string>(
                    'VNPAY_LOCALE',
                ) ?? 'vn',

            vnp_ReturnUrl: returnUrl,

            vnp_IpAddr: this.normalizeIpAddress(
                input.ipAddress,
            ),

            vnp_CreateDate: this.formatVnpDate(now),

            vnp_ExpireDate: this.formatVnpDate(
                input.expiresAt,
            ),
        };

        const signData = this.buildQueryString(params);

        const secureHash = this.createSecureHash(
            signData,
        );

        return (
            `${paymentUrl}?${signData}` +
            `&vnp_SecureHash=${secureHash}`
        );
    }

    verifyCallback(
        query: Record<string, string>,
    ): boolean {
        const receivedHash =
            query.vnp_SecureHash;

        if (!receivedHash) {
            return false;
        }

        const params: Record<string, string> = {};

        for (const [key, value] of Object.entries(query)) {
            if (
                key !== 'vnp_SecureHash' &&
                key !== 'vnp_SecureHashType' &&
                typeof value === 'string'
            ) {
                params[key] = value;
            }
        }

        const signData =
            this.buildQueryString(params);

        const expectedHash =
            this.createSecureHash(signData);

        if (
            receivedHash.length !==
            expectedHash.length
        ) {
            return false;
        }

        return timingSafeEqual(
            Buffer.from(
                receivedHash.toLowerCase(),
                'utf8',
            ),
            Buffer.from(expectedHash, 'utf8'),
        );
    }

    parseVnpayDate(
        value: string | undefined,
    ): Date | null {
        if (!value || !/^\d{14}$/.test(value)) {
            return null;
        }

        const year = Number(value.slice(0, 4));
        const month = Number(value.slice(4, 6));
        const day = Number(value.slice(6, 8));
        const hour = Number(value.slice(8, 10));
        const minute = Number(value.slice(10, 12));
        const second = Number(value.slice(12, 14));

        /*
         * Việt Nam là UTC+7.
         */
        return new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                hour - 7,
                minute,
                second,
            ),
        );
    }

    private buildQueryString(
        params: Record<string, string>,
    ): string {
        const sortedEntries = Object.entries(
            params,
        )
            .filter(
                ([, value]) =>
                    value !== undefined &&
                    value !== null &&
                    value !== '',
            )
            .sort(([firstKey], [secondKey]) =>
                firstKey.localeCompare(secondKey),
            );

        const searchParams =
            new URLSearchParams();

        for (const [key, value] of sortedEntries) {
            searchParams.append(key, value);
        }

        return searchParams.toString();
    }

    private createSecureHash(
        signData: string,
    ): string {
        const hashSecret =
            this.getRequiredConfig(
                'VNPAY_HASH_SECRET',
            );

        return createHmac(
            'sha512',
            hashSecret,
        )
            .update(signData, 'utf8')
            .digest('hex');
    }

    private formatVnpDate(
        date: Date,
    ): string {
        const formatter =
            new Intl.DateTimeFormat(
                'en-GB',
                {
                    timeZone:
                        'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hourCycle: 'h23',
                },
            );

        const parts = formatter
            .formatToParts(date)
            .reduce<Record<string, string>>(
                (result, part) => {
                    result[part.type] = part.value;
                    return result;
                },
                {},
            );

        return (
            `${parts.year}` +
            `${parts.month}` +
            `${parts.day}` +
            `${parts.hour}` +
            `${parts.minute}` +
            `${parts.second}`
        );
    }

    private normalizeIpAddress(
        ipAddress: string,
    ): string {
        if (
            ipAddress === '::1' ||
            ipAddress === '::ffff:127.0.0.1'
        ) {
            return '127.0.0.1';
        }

        return ipAddress.replace(
            '::ffff:',
            '',
        );
    }

    private normalizeOrderInfo(
        value: string,
    ): string {
        return value
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                '',
            )
            .replace(
                /[^a-zA-Z0-9 ]/g,
                ' ',
            )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 255);
    }

    private getRequiredConfig(
        key: string,
    ): string {
        const value =
            this.configService.get<string>(
                key,
            );

        if (!value) {
            throw new InternalServerErrorException(
                `${key} chưa được cấu hình`,
            );
        }

        return value;
    }
}