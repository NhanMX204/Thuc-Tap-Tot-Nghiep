import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    QueryFailedError,
} from 'typeorm';

import type {
    Request,
    Response,
} from 'express';

@Injectable()
@Catch()
export class AllExceptionsFilter
    implements ExceptionFilter {
    private readonly logger =
        new Logger(
            AllExceptionsFilter.name,
        );

    constructor(
        private readonly configService: ConfigService,
    ) { }

    catch(
        exception: unknown,
        host: ArgumentsHost,
    ): void {
        const context =
            host.switchToHttp();

        const response =
            context.getResponse<Response>();

        const request =
            context.getRequest<Request>();

        let statusCode =
            HttpStatus.INTERNAL_SERVER_ERROR;

        let message:
            | string
            | string[] =
            'Đã xảy ra lỗi hệ thống';

        let error = 'Internal Server Error';

        if (
            exception instanceof
            HttpException
        ) {
            statusCode =
                exception.getStatus();

            const exceptionResponse =
                exception.getResponse();

            if (
                typeof exceptionResponse ===
                'string'
            ) {
                message = exceptionResponse;
            } else if (
                typeof exceptionResponse ===
                'object' &&
                exceptionResponse !== null
            ) {
                const body =
                    exceptionResponse as {
                        message?:
                        | string
                        | string[];
                        error?: string;
                    };

                message =
                    body.message ??
                    exception.message;

                error =
                    body.error ??
                    exception.name;
            }
        } else if (
            exception instanceof
            QueryFailedError
        ) {
            const driverError =
                exception.driverError as {
                    code?: string;
                    errno?: number;
                };

            if (
                driverError.code ===
                'ER_DUP_ENTRY' ||
                driverError.errno === 1062
            ) {
                statusCode =
                    HttpStatus.CONFLICT;

                message =
                    'Dữ liệu đã tồn tại';

                error = 'Conflict';
            }
        }

        if (
            statusCode >=
            HttpStatus.INTERNAL_SERVER_ERROR
        ) {
            this.logger.error(
                `${request.method} ${request.url}`,
                exception instanceof Error
                    ? exception.stack
                    : String(exception),
            );
        }

        const isProduction =
            this.configService.get<string>(
                'NODE_ENV',
            ) === 'production';

        response
            .status(statusCode)
            .json({
                statusCode,
                message,
                error,
                timestamp:
                    new Date().toISOString(),
                path: request.url,
                method: request.method,

                ...(!isProduction &&
                    statusCode >= 500 &&
                    exception instanceof Error
                    ? {
                        debug:
                            exception.message,
                    }
                    : {}),
            });
    }
}