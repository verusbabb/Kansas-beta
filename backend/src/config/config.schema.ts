import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min, Max } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  PORT: string = '3000';

  // Frontend
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL?: string;

  // Database (for future use)
  @IsString()
  @IsOptional()
  DATABASE_HOST?: string;

  @IsString()
  @IsOptional()
  DATABASE_PORT?: string;

  @IsString()
  @IsOptional()
  DATABASE_NAME?: string;

  @IsString()
  @IsOptional()
  DATABASE_USER?: string;

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD?: string;

  // JWT (for future use)
  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  // GCP (for Secret Manager integration)
  @IsString()
  @IsOptional()
  GCP_PROJECT_ID?: string;

  @IsString()
  @IsOptional()
  GCP_SECRET_MANAGER_ENABLED?: string;

  // Auth0
  @IsString()
  @IsOptional()
  AUTH0_DOMAIN?: string;

  @IsString()
  @IsOptional()
  AUTH0_AUDIENCE?: string;
}

