#!/usr/bin/env node

/**
 * Seeder Runner Script
 * This script runs database seeders in production
 * It loads secrets from Secret Manager before running seeders
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
      const { initializeSecrets } = require('../dist/config/secrets/secret-loader');
      await initializeSecrets(projectId, true);
    } catch (error) {
      console.warn('⚠ Could not load secrets from Secret Manager:', error.message);
      console.warn('⚠ Falling back to environment variables');
    }
  }
}

async function runSeeders() {
  try {
    // Load secrets first
    await loadSecrets();

    // Verify database connection details
    if (!process.env.DATABASE_HOST || !process.env.DATABASE_NAME || !process.env.DATABASE_USER) {
      throw new Error('Missing required database environment variables');
    }

    console.log('Running database seeders...');
    console.log(`Database: ${process.env.DATABASE_NAME}`);
    console.log(`Host: ${process.env.DATABASE_HOST}`);

    // Run seeders using sequelize-cli
    execSync('npm run seed:run', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: process.env,
    });

    console.log('✓ Seeders completed successfully');
  } catch (error) {
    console.error('✗ Seeder failed:', error.message);
    process.exit(1);
  }
}

runSeeders();

