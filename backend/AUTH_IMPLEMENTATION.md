# Auth0 Authentication & Authorization Implementation

## Backend Implementation Status

✅ **Completed:**

1. **User Entity & Migration**
   - Created `User` entity with UUID, email, firstName, lastName, role, auth0Id
   - Created migration: `20251224151824-create-users-table.ts`
   - Registered User model in DatabaseModule

2. **Auth0 Configuration**
   - Added `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` to config schema
   - Updated AppConfig interface

3. **Auth0 JWT Strategy**
   - Created `JwtStrategy` using Passport with JWKS validation
   - Validates Auth0 JWT tokens

4. **Guards & Decorators**
   - `JwtAuthGuard`: Validates JWT tokens
   - `RolesGuard`: Checks user roles
   - `@Roles()` decorator: Specifies required roles
   - `@CurrentUser()` decorator: Extracts user from request

5. **User Lookup Interceptor**
   - `UserLookupInterceptor`: Looks up user in database after JWT validation
   - Links Auth0 account on first login
   - Attaches User entity to request

6. **Users Module**
   - CRUD endpoints for user management
   - All endpoints protected with admin role requirement
   - `GET /users/me` endpoint for current user profile

7. **Newsletters Module Updates**
   - `POST /newsletters` now requires editor/admin role
   - `DELETE /newsletters/:id` now requires editor/admin role
   - `GET /newsletters` remains public

## Required Packages

You need to install these packages:

```bash
cd backend
npm install @nestjs/passport passport passport-jwt jwks-rsa @types/passport-jwt
```

## Environment Variables

Add to your `.env` file:

```env
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://kansas-beta-api
```

**Important:** Do NOT use the Management API identifier. You need to create your own API in Auth0:

1. Go to Auth0 Dashboard → Applications → APIs
2. Click "Create API"
3. Name: "Kansas Beta API"
4. Identifier: `https://kansas-beta-api` (must be a URL format, but doesn't need to exist)
5. Signing Algorithm: RS256
6. Copy the Identifier value - this is your `AUTH0_AUDIENCE`

For production, set these in GCP Secret Manager or Cloud Run environment variables.

## Database Migration & Seeding

Run the migration to create the users table:

```bash
cd backend
npm run migration:run:dev  # for local development
# or
npm run migration:run      # for production
```

### Create Initial Admin User

After running the migration, seed the initial admin user:

```bash
npm run seed:run:dev  # for local development
# or
npm run seed:run      # for production
```

This will create:
- Email: `stevebabbmail@gmail.com`
- Name: Steve Babb
- Role: admin
- auth0Id: null (will be linked when you sign up in Auth0)

**Important:** Make sure you use this exact email (`stevebabbmail@gmail.com`) when you sign up in Auth0, or the backend won't be able to link your Auth0 account to this database user.

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /newsletters` - List all newsletters
- `GET /newsletters/:id` - Get a newsletter by ID
- `GET /health` - Health check

### Protected Endpoints (Auth Required)

**Users (Admin Only):**
- `POST /users` - Create user (admin only)
- `GET /users/me` - Get current user profile (authenticated)
- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user by ID (admin only)
- `PATCH /users/:id` - Update user (admin only)
- `DELETE /users/:id` - Delete user (admin only)

**Newsletters:**
- `POST /newsletters` - Create newsletter (editor/admin only)
- `DELETE /newsletters/:id` - Delete newsletter (editor/admin only)

## Usage in Controllers

```typescript
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserLookupInterceptor } from '../auth/interceptors/user-lookup.interceptor';
import { UserRole } from '../database/entities/user.entity';

@Controller('example')
export class ExampleController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UserLookupInterceptor)
  async protected(@CurrentUser() user: User) {
    // user is available with role
    return { message: 'Protected endpoint', userId: user.id };
  }

  @Post('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(UserLookupInterceptor)
  @Roles(UserRole.ADMIN)
  async adminOnly(@CurrentUser() user: User) {
    // Only admins can access
    return { message: 'Admin endpoint', userId: user.id };
  }
}
```

## Next Steps: Frontend Implementation

1. Update API client to include Auth0 tokens
2. Create auth store/composable
3. Add route guards for protected routes
4. Update UI to show/hide based on auth state and role

