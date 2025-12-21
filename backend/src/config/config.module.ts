import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './config.validation';
import configuration from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // Make config available everywhere
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'], // Load .env.local first, then .env
      expandVariables: true, // Support variable expansion in .env files
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

