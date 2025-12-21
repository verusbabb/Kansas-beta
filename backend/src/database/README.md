# Database Module

This module provides Sequelize ORM integration for the NestJS backend.

## Quick Start

### Local Development

1. Ensure PostgreSQL is running locally
2. Set up `.env` file with database credentials
3. Start the server - tables are auto-created via sync

### Production Deployment

1. Migrations run automatically during Cloud Build
2. Database schema is updated before app deployment
3. Seed data can be run separately if needed

## File Structure

```
src/database/
  config/
    database.config.js      # Sequelize CLI configuration
  entities/
    base.entity.ts         # Base entity with common fields
    example.entity.ts      # Example model
  migrations/              # Database migration files
    20241207000000-create-examples-table.ts
  seeders/                # Database seed files
    20241207000000-seed-example-data.ts
  database.module.ts       # NestJS module configuration
  README.md               # This file
  MIGRATIONS.md           # Detailed migration guide
```

## Creating Models

All models should:
1. Extend `BaseEntity` (provides `createdAt`, `updatedAt`, `deletedAt`)
2. Use `@Table` decorator from `sequelize-typescript`
3. Be registered in `DatabaseModule` via `SequelizeModule.forFeature()`

Example:

```typescript
import { Table, Column, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Enables soft deletes
})
export class User extends BaseEntity {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email!: string;
}
```

Then add to `DatabaseModule`:

```typescript
SequelizeModule.forFeature([Example, User])
```

## Using Models in Services

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Example } from './database/entities/example.entity';

@Injectable()
export class ExampleService {
  constructor(
    @InjectModel(Example)
    private exampleModel: typeof Example,
  ) {}

  async findAll(): Promise<Example[]> {
    return this.exampleModel.findAll();
  }
}
```

## Migration Workflow

See [MIGRATIONS.md](./MIGRATIONS.md) for detailed migration workflow.

**Quick Summary:**
1. Develop locally (auto-sync creates tables)
2. Generate migration when ready: `npm run migration:generate -- create-users-table`
3. Test locally: `npm run migration:run:dev`
4. Commit and deploy (migrations run automatically)

## Connection Details

- **Local**: `localhost:5432` (from `.env`)
- **Production**: Cloud SQL Unix socket (from Secret Manager)
- Auto-sync: Enabled in development, disabled in production
- Migrations: Run automatically in Cloud Build

## Environment Variables

Required in `.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=verusware
DATABASE_USER=postgres
DATABASE_PASSWORD=breck4355
```

Production uses Secret Manager for sensitive values.
