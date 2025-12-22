import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || 'An error occurred',
      ...(typeof message === 'object' && !(message instanceof String)
        ? { errors: message }
        : {}),
    };

    // Log the error
    if (status >= 500) {
      const errorDetails = {
        ...errorResponse,
        stack: exception instanceof Error ? exception.stack : undefined,
        errorName: exception instanceof Error ? exception.name : undefined,
        errorMessage: exception instanceof Error ? exception.message : String(exception),
        // Include Sequelize-specific error details if present
        ...(exception && typeof exception === 'object' && 'original' in exception
          ? {
              original: (exception as any).original,
              sql: (exception as any).sql,
              parameters: (exception as any).parameters,
            }
          : {}),
      };
      this.logger.error(errorDetails, 'Unhandled exception');
    } else {
      this.logger.warn(errorResponse, 'Client error');
    }

    response.status(status).json(errorResponse);
  }
}

