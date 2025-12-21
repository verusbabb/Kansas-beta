import { registerAs } from '@nestjs/config';
import { EnvironmentVariables, Environment } from './config.schema';

export interface AppConfig {
  app: {
    env: Environment;
    port: number;
    name: string;
  };
  frontend: {
    url: string;
  };
  database: {
    host?: string;
    port?: number;
    name?: string;
    user?: string;
    password?: string;
  };
  jwt: {
    secret?: string;
    expiresIn?: string;
  };
  gcp: {
    projectId?: string;
    secretManagerEnabled: boolean;
  };
}

export default registerAs('config', (): AppConfig => {
  const env = process.env as unknown as EnvironmentVariables;

  return {
    app: {
      env: (env.NODE_ENV as Environment) || Environment.Development,
      port: env.PORT ? parseInt(env.PORT, 10) : 3000,
      name: 'Verusware',
    },
    frontend: {
      url: env.FRONTEND_URL || 'http://localhost:5173',
    },
    database: {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT ? parseInt(env.DATABASE_PORT, 10) : undefined,
      name: env.DATABASE_NAME,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN || '1d',
    },
    gcp: {
      projectId: env.GCP_PROJECT_ID,
      secretManagerEnabled: env.GCP_SECRET_MANAGER_ENABLED === 'true',
    },
  };
});

