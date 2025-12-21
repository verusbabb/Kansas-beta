#!/usr/bin/env node

/**
 * Migration Runner Script
 * This script runs database migrations in production
 * It loads secrets from Secret Manager before running migrations
 */

const { execSync } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: ['.env.local', '.env'] });

// Load secrets from Secret Manager if enabled
async function loadSecrets() {
  const secretManagerEnabled = process.env.GCP_SECRET_MANAGER_ENABLED === 'true';
  const projectId = process.env.GCP_PROJECT_ID;

  if (secretManagerEnabled && projectId) {
    try {
      // Import secret loader
      const secretLoaderPath = path.join(__dirname, '../src/config/secrets/secret-loader.ts');
      // For production, we'll use the compiled version
      const { initializeSecrets } = require('../dist/config/secrets/secret-loader');
      await initializeSecrets(projectId, true);
      console.log('✓ Secrets loaded from Secret Manager');
    } catch (error) {
      console.warn('⚠ Could not load secrets from Secret Manager:', error.message);
      console.warn('⚠ Falling back to environment variables');
    }
  }
}

async function runMigrations() {
  try {
    // Load secrets first
    await loadSecrets();

    // Verify database connection details
    if (!process.env.DATABASE_HOST || !process.env.DATABASE_NAME || !process.env.DATABASE_USER) {
      throw new Error('Missing required database environment variables');
    }

    console.log('Running database migrations...');
    console.log(`Database: ${process.env.DATABASE_NAME}`);
    console.log(`Host: ${process.env.DATABASE_HOST}`);

    // Run migrations using sequelize-cli
    execSync('npm run migration:run', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: process.env,
    });

    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();


