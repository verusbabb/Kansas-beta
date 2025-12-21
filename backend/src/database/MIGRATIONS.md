# Database Migrations & Seeders

This document explains how to use migrations and seeders for database schema management.

## Overview

- **Local Development**: Auto-sync creates/updates tables automatically (fast iteration)
- **Production**: Migrations run automatically during deployment (safe, version-controlled)

## Migration Workflow

### 1. Develop Locally

When you create or modify models, auto-sync handles table creation:

```typescript
// Create a new model
@Table({ tableName: 'users' })
export class User extends BaseEntity {
  // ... fields
}
```

The table is automatically created when you start the dev server.

### 2. Generate Migration (When Ready to Deploy)

When you're happy with your changes and ready to deploy:

```bash
# Generate a migration from your model changes
npm run migration:generate -- create-users-table

# This creates: src/database/migrations/TIMESTAMP-create-users-table.ts
```

### 3. Review and Edit Migration

Edit the generated migration file to ensure it matches your model:

```typescript
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('users', {
    // ... table definition
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('users');
}
```

### 4. Test Migration Locally

```bash
# Run migrations locally (uses development database)
npm run migration:run:dev

# Check status
npm run migration:status

# Rollback if needed
npm run migration:undo:dev
```

### 5. Commit and Deploy

```bash
git add src/database/migrations/
git commit -m "Add users table migration"
git push
```

During deployment, Cloud Build automatically runs migrations before deploying the app.

## Seeder Workflow

Seeders populate the database with initial/reference data (catalog tables, etc.).

### Generate a Seeder

```bash
npm run seed:generate -- seed-catalog-data
```

### Edit Seeder File

```typescript
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkInsert('catalog', [
    { name: 'Item 1', code: 'CAT001' },
    { name: 'Item 2', code: 'CAT002' },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('catalog', {
    code: ['CAT001', 'CAT002'],
  });
}
```

### Run Seeders

```bash
# Development
npm run seed:run:dev

# Production (runs automatically in Cloud Build if configured)
npm run seed:run
```

## Available Commands

### Migrations

```bash
# Generate a new migration
npm run migration:generate -- <migration-name>

# Run migrations (production)
npm run migration:run

# Run migrations (development)
npm run migration:run:dev

# Rollback last migration (production)
npm run migration:undo

# Rollback last migration (development)
npm run migration:undo:dev

# Check migration status
npm run migration:status
```

### Seeders

```bash
# Generate a new seeder
npm run seed:generate -- <seeder-name>

# Run all seeders (production)
npm run seed:run

# Run all seeders (development)
npm run seed:run:dev

# Undo all seeders (production)
npm run seed:undo

# Undo all seeders (development)
npm run seed:undo:dev
```

## Migration Best Practices

1. **Always test locally first**: Run migrations in development before deploying
2. **One migration per feature**: Keep migrations focused and atomic
3. **Include rollback**: Always implement the `down()` function
4. **Don't modify existing migrations**: Create new migrations to fix issues
5. **Use transactions**: Wrap migrations in transactions when possible
6. **Review generated migrations**: Auto-generated migrations may need adjustments

## Production Deployment

Migrations run automatically during Cloud Build:

1. Backend image is built
2. Migrations run (connects to Cloud SQL)
3. App is deployed
4. App connects to updated database

## Troubleshooting

### Migration fails in production

1. Check Cloud Build logs for error details
2. Verify database credentials in Secret Manager
3. Ensure Cloud SQL instance is accessible
4. Check migration file syntax

### Need to rollback

```bash
# Rollback last migration
npm run migration:undo

# Or manually connect to Cloud SQL and fix
```

### Migration already ran

Migrations are tracked in the `SequelizeMeta` table. If a migration already ran, it won't run again.

## File Structure

```
backend/
  src/
    database/
      config/
        database.config.js    # Sequelize CLI config
      entities/                # Your models
        base.entity.ts
        example.entity.ts
      migrations/              # Migration files
        20241207000000-create-examples-table.ts
      seeders/                 # Seeder files
        20241207000000-seed-example-data.ts
```

## Environment Variables

Migrations use the same environment variables as your app:

- `DATABASE_HOST` - Database host (localhost or Cloud SQL socket)
- `DATABASE_PORT` - Database port (default: 5432)
- `DATABASE_NAME` - Database name
- `DATABASE_USER` - Database username
- `DATABASE_PASSWORD` - Database password (from Secret Manager in production)
- `GCP_SECRET_MANAGER_ENABLED` - Enable Secret Manager (production)
- `GCP_PROJECT_ID` - GCP Project ID

## Example: Adding a New Model

1. Create model: `src/database/entities/user.entity.ts`
2. Add to `DatabaseModule`: `SequelizeModule.forFeature([User])`
3. Auto-sync creates table locally
4. Generate migration: `npm run migration:generate -- create-users-table`
5. Review/edit migration file
6. Test: `npm run migration:run:dev`
7. Commit and push
8. Deploy → migrations run automatically


