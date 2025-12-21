import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

export const createLoggerConfig = (configService: ConfigService<AppConfig>): Params => {
  const config = configService.get<AppConfig>('config', { infer: true })!;
  
  return {
    pinoHttp: {
      level: config.app.env === 'production' ? 'info' : 'debug',
      transport:
        config.app.env !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
      // Add request ID for tracing
      genReqId: (req) => {
        return req.headers['x-request-id'] || req.id;
      },
    },
  };
};

