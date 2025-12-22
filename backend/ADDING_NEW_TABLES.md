# Adding New Database Tables

This guide explains how to add new tables to the database and deploy them.

## Quick Workflow

1. **Create the Entity** (model)
2. **Generate Migration**
3. **Register Model** in DatabaseModule
4. **Test Locally**
5. **Deploy** (migrations run automatically)

---

## Step-by-Step Guide

### 1. Create the Entity

Create a new entity file in `backend/src/database/entities/`:

```typescript
// backend/src/database/entities/your-entity.entity.ts
import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'your_table_name',
  timestamps: true,
  paranoid: true, // Enables soft deletes
})
export class YourEntity extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  // Add more columns as needed
}
```

**Key Points:**
- Always extend `BaseEntity` (provides `createdAt`, `updatedAt`, `deletedAt`)
- Use UUID for primary keys (best practice)
- Use `@Index` decorator for columns you'll query frequently
- Use `paranoid: true` for soft deletes

### 2. Generate Migration

Generate a migration file from your entity:

```bash
cd backend
npm run migration:generate -- create-your-table-name
```

This creates a file like: `backend/src/database/migrations/TIMESTAMP-create-your-table-name.ts`

**Review the generated migration** - it should match your entity. Common things to check:
- Column types are correct
- Indexes are included
- Constraints are set up properly

### 3. Register Model in DatabaseModule

Add your entity to `backend/src/database/database.module.ts`:

```typescript
import { YourEntity } from './entities/your-entity.entity';

// In the SequelizeModule.forRootAsync models array:
models: [GuestList, Newsletter, YourEntity],

// In the SequelizeModule.forFeature array:
SequelizeModule.forFeature([GuestList, Newsletter, YourEntity]),
```

### 4. Test Locally

**Create the database table locally:**

```bash
cd backend
npm run migration:run:dev
```

**Or** just start the backend - auto-sync will create it in development:

```bash
npm run start:dev
```

**Verify the table was created:**

```bash
# Connect to your local database
psql -U postgres -d kansas_beta

# List tables
\dt

# Check your table structure
\d your_table_name
```

### 5. Deploy to Production

**Option A: Full Deployment (Recommended)**

```bash
./deploy.sh
```

This will:
- Build backend and frontend
- Run migrations automatically (creates new tables)
- Deploy both services

**Option B: Backend Only**

```bash
./deploy.sh backend
```

**Note:** If you only added a table and didn't change code, you can just run migrations:

```bash
./run-migrations-only.sh
```

---

## Example: Adding a "Members" Table

### 1. Create Entity

```typescript
// backend/src/database/entities/member.entity.ts
import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'members',
  timestamps: true,
  paranoid: true,
})
export class Member extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName!: string;

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  graduationYear!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive!: boolean;
}
```

### 2. Generate Migration

```bash
cd backend
npm run migration:generate -- create-members-table
```

### 3. Register in DatabaseModule

```typescript
// Add to imports
import { Member } from './entities/member.entity';

// Add to models array
models: [GuestList, Newsletter, Member],

// Add to forFeature array
SequelizeModule.forFeature([GuestList, Newsletter, Member]),
```

### 4. Test Locally

```bash
npm run migration:run:dev
# or
npm run start:dev
```

### 5. Deploy

```bash
./deploy.sh
```

---

## Best Practices

### ✅ DO:

- **Always create migrations** for production changes
- **Test migrations locally** before deploying
- **Use UUIDs** for primary keys
- **Add indexes** for frequently queried columns
- **Use soft deletes** (`paranoid: true`) for important data
- **Review generated migrations** before committing

### ❌ DON'T:

- **Don't modify existing migrations** - create new ones instead
- **Don't skip testing** migrations locally
- **Don't use auto-increment IDs** - use UUIDs
- **Don't forget to register** models in DatabaseModule
- **Don't deploy without migrations** - tables won't exist in production

---

## Troubleshooting

### Migration Fails in Production

1. **Check Cloud Build logs:**
   ```bash
   ./check-backend-logs.sh
   ```

2. **Verify migration file syntax** - check for typos

3. **Check if table already exists:**
   ```bash
   # Connect to Cloud SQL
   gcloud sql connect kansas-beta-db --database=kansas_beta
   \dt
   ```

4. **Rollback if needed:**
   ```bash
   cd backend
   npm run migration:undo
   ```

### Table Not Created

- Verify migration ran: Check Cloud Build logs
- Check model is registered in DatabaseModule
- Verify entity extends BaseEntity correctly
- Check for TypeScript compilation errors

### Migration Already Ran

Migrations are tracked in the `SequelizeMeta` table. If a migration already ran, it won't run again. This is normal and safe.

---

## Quick Reference

```bash
# Generate migration
npm run migration:generate -- create-table-name

# Run migrations locally
npm run migration:run:dev

# Check migration status
npm run migration:status

# Rollback last migration (local)
npm run migration:undo:dev

# Deploy everything (runs migrations automatically)
./deploy.sh

# Run migrations only in production
./run-migrations-only.sh
```

---

## Summary

**For each new table:**

1. ✅ Create entity in `backend/src/database/entities/`
2. ✅ Generate migration: `npm run migration:generate -- create-table-name`
3. ✅ Register in `DatabaseModule`
4. ✅ Test locally: `npm run migration:run:dev`
5. ✅ Deploy: `./deploy.sh`

That's it! Migrations run automatically during deployment. 🚀

