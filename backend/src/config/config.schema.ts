import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator'

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development

  @IsString()
  PORT: string = '3000'

  // Frontend
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL?: string

  // Database (for future use)
  @IsString()
  @IsOptional()
  DATABASE_HOST?: string

  @IsString()
  @IsOptional()
  DATABASE_PORT?: string

  @IsString()
  @IsOptional()
  DATABASE_NAME?: string

  @IsString()
  @IsOptional()
  DATABASE_USER?: string

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD?: string

  // JWT (for future use)
  @IsString()
  @IsOptional()
  JWT_SECRET?: string

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string

  // GCP (for Secret Manager integration)
  @IsString()
  @IsOptional()
  GCP_PROJECT_ID?: string

  @IsString()
  @IsOptional()
  GCP_SECRET_MANAGER_ENABLED?: string

  // Auth0
  @IsString()
  @IsOptional()
  AUTH0_DOMAIN?: string

  @IsString()
  @IsOptional()
  AUTH0_AUDIENCE?: string

  @IsString()
  @IsOptional()
  AUTH0_MGMT_CLIENT_ID?: string

  @IsString()
  @IsOptional()
  AUTH0_MGMT_CLIENT_SECRET?: string

  @IsString()
  @IsOptional()
  AUTH0_DB_CONNECTION?: string

  @IsString()
  @IsOptional()
  PRE_REG_SECRET?: string

  // Google Cloud Storage
  @IsString()
  @IsOptional()
  GCS_BUCKET_NAME?: string

  // Alumni enrichment (optional — feature degrades gracefully without these)
  @IsString()
  @IsOptional()
  PDL_API_KEY?: string

  @IsString()
  @IsOptional()
  FULLCONTACT_API_KEY?: string

  @IsString()
  @IsOptional()
  DATAGMA_API_KEY?: string

  // Gemini AI (Ask feature)
  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string

  // SendGrid
  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string

  @IsString()
  @IsOptional()
  SENDGRID_RUSH_CONFIRMATION_TEMPLATE_ID?: string

  @IsString()
  @IsOptional()
  SENDGRID_FROM_EMAIL?: string

  @IsString()
  @IsOptional()
  SENDGRID_FROM_NAME?: string

  @IsString()
  @IsOptional()
  SENDGRID_RUSH_NOTIFICATION_EMAIL?: string
}
