/**
 * Sequelize CLI Configuration (JavaScript version)
 * This file is used by sequelize-cli for migrations and seeders
 * It reads from environment variables (same as NestJS config)
 * 
 * Note: This is the JavaScript version for sequelize-cli compatibility
 * The TypeScript version is database.config.ts
 * 
 * Secrets are loaded by the migration script (run-migrations.js) before
 * sequelize-cli is called, so this file just reads from process.env
 */

// Load environment variables (for local development)
// In production, secrets are already loaded by run-migrations.js
require('dotenv').config({ path: ['.env.local', '.env'] });
const databaseConfig = {
  development: {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'kansas_beta',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: console.log,
  },
  production: {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD, // Will be loaded from Secret Manager
    database: process.env.DATABASE_NAME || 'kansas_beta',
    host: process.env.DATABASE_HOST, // Will be Cloud SQL socket path
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    // For Cloud SQL Unix socket connections
    dialectOptions: (process.env.DATABASE_HOST?.includes('/cloudsql/')
      ? {
          socketPath: process.env.DATABASE_HOST,
        }
      : {}),
  },
  test: {
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'kansas_beta_test',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
};

// Export for sequelize-cli (CommonJS)
module.exports = databaseConfig;

