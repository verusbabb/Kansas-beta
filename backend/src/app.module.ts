import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { ConfigController } from './config/config.controller';
import { NewslettersModule } from './newsletters/newsletters.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { createLoggerConfig } from './config/logger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule, // Load configuration (must be first)
    DatabaseModule, // Database connection (requires ConfigModule)
    AuthModule, // Authentication and authorization
    NewslettersModule, // Newsletters API
    UsersModule, // Users management API
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        return createLoggerConfig(configService);
      },
    }),
  ],
  controllers: [HealthController, ConfigController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}

