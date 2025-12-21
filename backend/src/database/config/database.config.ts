/**
 * Sequelize CLI Configuration
 * This file is used by sequelize-cli for migrations and seeders
 * It reads from environment variables (same as NestJS config)
 * In production, loads secrets from GCP Secret Manager
 * 
 * Note: This file uses CommonJS syntax for sequelize-cli compatibility
 */

const { config: dotenvConfig } = require('dotenv');

// Load environment variables
dotenvConfig({ path: ['.env.local', '.env'] });

// PostgreSQL dialect options type
interface PostgresDialectOptions {
  socketPath?: string;
  [key: string]: unknown;
}

// Sequelize config interface (for sequelize-cli)
interface SequelizeConfig {
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
  dialect: string;
  logging?: boolean | ((sql: string) => void);
  dialectOptions?: PostgresDialectOptions;
  [key: string]: unknown;
}

const databaseConfig: { [key: string]: SequelizeConfig } = {
  development: {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'verusware',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: console.log,
  },
  production: {
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD, // Will be loaded from Secret Manager
    database: process.env.DATABASE_NAME || 'verusware',
    host: process.env.DATABASE_HOST, // Will be Cloud SQL socket path
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    // For Cloud SQL Unix socket connections
    dialectOptions: (process.env.DATABASE_HOST?.includes('/cloudsql/')
      ? {
          socketPath: process.env.DATABASE_HOST,
        }
      : {}) as PostgresDialectOptions,
  },
  test: {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'verusware_test',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
};

// Export for sequelize-cli (CommonJS)
module.exports = databaseConfig;
