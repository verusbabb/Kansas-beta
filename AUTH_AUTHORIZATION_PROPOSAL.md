# Authentication & Authorization Proposal

## Overview
This document outlines a best practices approach for implementing authentication and authorization using Auth0, without over-complicating the system.

## Use Case Context

**Important:** Most of the site is **public** (no login required). Authentication is only needed for:
- **Admin panel** - Full access requires login + admin/editor role
- **People tab** - Certain views/actions require login + role check
- **Protected backend endpoints** - Only specific endpoints require authentication

This means:
- ✅ Login is **optional/on-demand** (users can browse without logging in)
- ✅ Route guards protect specific routes (admin panel, protected views)
- ✅ Backend endpoints are mostly public, with selective protection
- ✅ UI conditionally shows/hides features based on auth state and role

## Architecture Principles

### 1. **Separation of Concerns**
- **Auth0**: Handles authentication (who you are) - login, logout, JWT tokens
- **Database**: Stores user information and roles (authorization data)
- **Backend**: Validates tokens and enforces authorization (what you can do)

### 2. **Security Model**
- **Never trust the frontend** for authorization decisions
- **Always validate** Auth0 tokens on the backend
- **Roles stored in database**, not in Auth0 (simpler, more flexible)
- **JWT tokens** contain user identity (Auth0 `sub`), not roles

## Proposed Implementation

### Database Schema

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,  -- Auth0 "sub" claim
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- 'viewer', 'editor', 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL  -- Soft delete
);

CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_email ON users(email);
```

**Key Design Decisions:**
- `auth0_id` is the link between Auth0 identity and your database user
- Roles stored in database (not in Auth0) for flexibility
- Soft deletes to preserve audit trail
- Email as the primary identifier for user management

### Backend Implementation

#### 1. **User Entity & Migration**
- Create `User` entity (Sequelize)
- Migration to create `users` table
- Register model in `DatabaseModule`

#### 2. **Auth0 JWT Validation**
- Use `@nestjs/passport` with `passport-jwt` strategy
- Validate Auth0 tokens on every protected request
- Extract `sub` (Auth0 user ID) from token

#### 3. **User Lookup & Role Retrieval**
- After token validation, look up user by email (or auth0_id) in database
- Handle edge cases (user not found, auth0_id mismatch)
- Attach user object (with role) to request for use in guards

**Implementation Pseudocode:**
```typescript
// After JWT validation in Passport strategy
const email = decodedToken.email;
const auth0Id = decodedToken.sub; // Auth0 user ID (format: "auth0|xxxxx")

// Look up user by email (more reliable than auth0_id for first-time linking)
const user = await User.findOne({ where: { email } });

if (!user) {
  // User authenticated with Auth0, but doesn't exist in our database
  throw new ForbiddenException('Account not authorized. Please contact an administrator.');
}

// Security check: If auth0_id exists and doesn't match, prevent account hijacking
if (user.auth0_id && user.auth0_id !== auth0Id) {
  throw new ForbiddenException('Account email is already linked to a different Auth0 account.');
}

// First-time login: Link Auth0 account to database user
if (!user.auth0_id && auth0Id) {
  user.auth0_id = auth0Id;
  await user.save();
}

// Attach user to request (includes role)
req.user = user; // { id, email, role, auth0_id, first_name, last_name, ... }
```

#### 4. **Role-Based Guards**
- `@Roles('admin', 'editor')` decorator for controllers/endpoints
- Guard checks if user's role is in allowed roles list
- Returns 403 if unauthorized

#### 5. **User Management API**
- `POST /users` - Create user (admin only, protected)
- `GET /users/me` - Get current user profile (authenticated, protected)
- `GET /users` - List users (admin only, protected)
- `PATCH /users/:id` - Update user (admin only, protected, can change role)
- `DELETE /users/:id` - Soft delete user (admin only, protected)

**Note:** Most other endpoints (like `/newsletters`, `/health`) remain **public** (no authentication required).

### Frontend Implementation

#### 1. **Token Management**
- Get Auth0 access token using `useAuth0().getAccessTokenSilently()` (only when needed)
- Add token to API requests via `Authorization: Bearer <token>` header
- Update `api.ts` interceptor to conditionally add token (only if authenticated)
- **Important:** Token is optional - most requests don't need it (public endpoints)

#### 2. **User Context/Store**
- Create `useAuth` composable or `auth` Pinia store
- Store Auth0 authentication state (`isAuthenticated`, `user`)
- Fetch user profile from `/users/me` endpoint **only when authenticated** (includes role)
- Store user info and role in store for UI decisions

#### 3. **Route Protection**
- Admin panel route: Require authentication + admin/editor role
- People tab protected views: Require authentication + appropriate role
- Public routes: No authentication required (Home, NewsLetters, Events, etc.)
- Route guard redirects to login if accessing protected route while not authenticated

#### 4. **Role-Based UI (Conditional Rendering)**
- Login button: Show when not authenticated, hide when authenticated
- Admin panel link: Show only if authenticated AND role is admin/editor
- Protected actions on People tab: Show only if authenticated AND role allows
- Use computed properties: `v-if="isAuthenticated && userRole === 'admin'"`
- Use `v-if="!isAuthenticated"` to show login prompts for protected features

#### 5. **User Management UI**
- Admin panel for creating/managing users (protected route)
- Form to create users: email, first name, last name, role selection
- List of existing users with role badges
- Edit/delete actions (admin only)

## Flow Diagrams

### Login Flow
```
1. User clicks "Log In" → Redirects to Auth0
2. User authenticates with Auth0
3. Auth0 redirects back with authorization code
4. Frontend exchanges code for access token (Auth0 SDK handles this)
5. Frontend stores token (in memory, via Auth0 SDK)
6. Frontend calls GET /users/me with token
7. Backend validates token, looks up user by auth0_id, returns user + role
8. Frontend stores user info in Pinia store
9. UI updates based on role
```

### Protected API Request Flow
```
1. Frontend makes API request
2. Axios interceptor adds: Authorization: Bearer <auth0_token>
3. Backend receives request
4. Passport JWT strategy validates token (checks signature, expiry, audience)
5. Extract email and auth0_id from validated token
6. User lookup by email in database
   - If not found → Return 403 "Account not authorized"
   - If found but auth0_id mismatch → Return 403 "Account already linked"
   - If found and auth0_id is NULL → Update auth0_id (first login linking)
7. Attach user (with role) to request object
8. Role guard checks if user's role is allowed
9. If allowed: Execute controller
10. If denied: Return 403 Forbidden
```

### User Creation Options

There are two approaches for creating users. **Recommended: Option 1** (simpler).

#### Option 1: Admin Creates Users in Database, User Signs Up in Auth0 (Recommended)
```
1. Admin fills form: email, first name, last name, role
2. Frontend sends POST /users with token
3. Backend validates admin role
4. Backend creates user record with:
   - email, first_name, last_name, role
   - auth0_id: NULL (user hasn't signed up in Auth0 yet)
5. User visits site, needs to create Auth0 account:
   Option A: Clicks "Sign Up" button → Auth0 signup form → Creates account with email
   Option B: Clicks "Login with Google" → Google authenticates → Auth0 auto-creates account
6. User creates Auth0 account with that email (must match admin-created email exactly)
7. User logs in with Auth0 (email/password or Google)
8. On first login, backend matches email to database user and updates auth0_id
9. User is now linked and can access based on their role
```

**Important: Auth0 Login Screen Behavior**

When a user clicks "Log In" in your app, Auth0's login screen shows:
- **"Log In" tab/form** - For users who already have Auth0 accounts
- **"Sign Up" tab/link** - For users who need to create Auth0 accounts
- **"Continue with Google" button** - Social login (auto-creates Auth0 account if needed)

**For users pre-created by admin:**
- ✅ They should click "Sign Up" on the Auth0 screen (or "Continue with Google")
- ❌ They should NOT click "Log In" first (will fail - account doesn't exist yet)
- ⚠️ **UX Note**: Consider showing a message like "First time? Click Sign Up" to guide users

**Alternative Flow (If user tries to login first - what you just experienced):**
1. User clicks "Log In" button → Redirects to Auth0 login screen
2. Auth0 login screen shows:
   - "Log In" tab (default) - for existing users
   - "Sign Up" tab - for new users  
   - "Continue with Google" button - social login
3. User enters email/password in "Log In" tab → Auth0 rejects (account doesn't exist)
4. User sees error: "Invalid email or password"
5. User clicks "Sign Up" tab on Auth0 screen
6. User creates account with same email admin used → Success
7. User can now log in

**Summary:** The Auth0 login screen has BOTH login and signup options. Users pre-created by admin should use the "Sign Up" tab (or Google login) on the Auth0 screen, not the "Log In" tab.

**✅ Confirmed Flow for Pre-Created Users:**

If a user exists in your database (created by admin) but NOT in Auth0 yet:

1. User clicks "Log In" button → Redirected to Auth0 login screen
2. User clicks "Sign Up" tab on Auth0 screen
3. User creates Auth0 account with **the same email** admin used in database
4. Auth0 creates the account and authenticates the user immediately
5. Auth0 returns JWT token with user's email
6. Backend receives token, extracts email, queries database
7. Backend finds matching user in database (by email)
8. Backend updates `auth0_id` field to link Auth0 account to database user
9. User is now authenticated and linked, can access based on their role

**Key Point:** The email used in Auth0 signup **must match exactly** the email the admin used when creating the user in the database. The backend matches them by email on first login.

**Important Edge Cases:**

**Scenario A: User clicks "Email/Password Login" but account doesn't exist in Auth0**
- Auth0 will reject the login attempt (standard Auth0 behavior)
- User sees error: "Invalid email or password" or "User doesn't exist"
- **Resolution**: 
  - User must click "Sign Up" tab on Auth0 login screen to create account
  - OR user can click "Continue with Google" (auto-creates account)
  - Then user can log in with their new account

**Scenario B: User clicks "Login with Google" (or other social login)**
- Google authenticates the user
- **Auth0 automatically creates a new user account** if they don't exist in Auth0 (social login behavior)
- Auth0 returns valid JWT token with user's email
- Backend receives JWT token, extracts email from token
- Backend queries database for user with matching email → **Not found**
- **Backend response**: Return 403 Forbidden with message: "Account not authorized. Please contact an administrator."
- **Rationale**: Access is controlled - users must be pre-created by admin in database. Social login bypasses Auth0 signup but NOT our database check.

**Scenario C: User clicks "Login", account exists in Auth0, but NOT in our database**
- Auth0 authentication succeeds (user has valid Auth0 account - either email/password or social)
- Backend receives JWT token, extracts email from token
- Backend queries database for user with matching email → **Not found**
- **Backend response**: Return 403 Forbidden with message: "Account not authorized. Please contact an administrator."
- **Rationale**: Access is controlled - users must be pre-created by admin in database

**Scenario D: User exists in database, clicks "Login" but hasn't signed up in Auth0 yet**
- **Email/Password**: Auth0 rejects login (account doesn't exist)
- **Social Login (Google)**: Auth0 creates account automatically, but user must use the SAME email as in database
- **Resolution**: User can use either method, but email must match what admin created in database

**Key Security Point**: The backend database check (user must exist) is what prevents unauthorized access, regardless of how they authenticate with Auth0 (email/password or social login).

**⚠️ Important: Google/Social Login Behavior**

Auth0's Google login (and other social logins) **automatically creates Auth0 user accounts** if they don't exist. This is different from email/password login, which requires explicit signup.

**What this means:**
- Someone could click "Login with Google" and get a valid Auth0 JWT token
- But the **backend database check still prevents unauthorized access**
- If the user doesn't exist in your database, they get 403 Forbidden
- **This is the security gate** - Auth0 account creation ≠ access to your application

**Recommendation:** This is actually fine! Social login is convenient for users, and your backend security still applies. The database check is what controls access.

**Pros:**
- Simpler - no Auth0 Management API needed
- Users self-register in Auth0
- Admin just pre-configures roles in your database

**Cons:**
- User must use the exact email admin created
- Requires email matching logic

#### Option 2: Admin Creates Users in Both Database AND Auth0
```
1. Admin fills form: email, first name, last name, role
2. Frontend sends POST /users with token
3. Backend validates admin role
4. Backend creates user in Auth0 via Management API (requires API token)
5. Backend creates user record in database with auth0_id from step 4
6. Auth0 sends invitation email (optional)
7. User clicks link, sets password, logs in
8. Backend already has auth0_id, so user is immediately linked
```

**Pros:**
- More control - admin creates everything
- Can send invitation emails
- No email matching needed

**Cons:**
- More complex - requires Auth0 Management API
- Need to manage Auth0 API tokens
- More moving parts

**Recommendation: Start with Option 1, upgrade to Option 2 if needed.**

## Implementation Steps (Recommended Order)

### Phase 1: Backend Foundation
1. Create `User` entity and migration
2. Set up Auth0 JWT validation (Passport strategy)
3. Create user lookup service/middleware
4. Implement `/users/me` endpoint (get current user)
5. Test with Postman/curl using Auth0 token

### Phase 2: User Management
1. Create user management endpoints (CRUD)
2. Add role guards
3. Protect existing endpoints (e.g., newsletters POST/DELETE require editor/admin)
4. Test role-based access

### Phase 3: Frontend Integration
1. Update API client to conditionally add Auth0 tokens (only when authenticated)
2. Create auth store/composable
3. Fetch user profile on login (when user authenticates)
4. Add route guards for protected routes (admin panel, protected People views)
5. Implement conditional UI rendering (show/hide features based on auth + role)
6. Create user management UI in Admin panel

#### Example Route Structure:
```typescript
// router/index.ts
const routes = [
  // Public routes (no auth required)
  { path: '/', component: Home },
  { path: '/rush', component: Rush },
  { path: '/newsletters', component: NewsLetters },
  { path: '/events', component: Events },
  { path: '/members', component: MembersAndAlumni }, // Mostly public, some actions protected
  { path: '/donate', component: Donate },
  { path: '/contact', component: ContactUs },
  
  // Protected routes (require auth + role)
  { 
    path: '/admin', 
    component: Admin,
    meta: { requiresAuth: true, requiredRole: ['admin', 'editor'] }
  },
]

// Route guard example
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiredRole = to.meta.requiredRole
  
  if (requiresAuth && !isAuthenticated.value) {
    // Redirect to login
    loginWithRedirect({ appState: { targetUrl: to.fullPath } })
    return
  }
  
  if (requiredRole && !requiredRole.includes(userRole.value)) {
    // Redirect to home or show error
    next('/')
    return
  }
  
  next()
})
```

### Phase 4: User Onboarding
1. Create user endpoint (admin creates users)
2. User management UI in admin panel
3. **User signup flow**: Ensure users know to click "Sign Up" on Auth0 screen (or use Google login)
4. (Future) Invitation email flow with instructions

**User Onboarding UX Consideration:**

When admin creates a user in the database, the user needs to:
1. Visit the site
2. Click "Log In" button (which redirects to Auth0)
3. On Auth0's login screen, click "Sign Up" tab (not "Log In" tab)
4. Create account with the same email admin used

**Alternative UX Improvements:**
- Change button label to "Log In / Sign Up" to make it clearer
- Add tooltip: "New users: Click 'Sign Up' on the login screen"
- Or create a separate "Sign Up" button that calls `loginWithRedirect({ screen_hint: 'signup' })` to show signup form directly

## Security Considerations

### ✅ What This Approach Gets Right
1. **Selective protection** - Only specific endpoints/routes require authentication
2. **Token validation on protected requests** - Backend validates tokens only when needed
3. **Public endpoints remain accessible** - No authentication barrier for public content
4. **Roles in database** - Easy to change without Auth0 config changes
5. **Role checks on backend** - Frontend can't bypass authorization
6. **Soft deletes** - Audit trail maintained
7. **Standard JWT validation** - Using well-tested libraries

### 🔒 Public vs Protected Endpoints

**Public Endpoints (No Auth Required):**
- `GET /health` - Health checks
- `GET /newsletters` - View newsletters
- `GET /config` - Public configuration
- Most GET endpoints for viewing content

**Protected Endpoints (Auth Required):**
- `POST /newsletters` - Create newsletter (requires editor/admin role)
- `DELETE /newsletters/:id` - Delete newsletter (requires editor/admin role)
- `GET /users/me` - Get current user (requires authentication)
- All `/users/*` endpoints (require admin role)
- Any other endpoints that modify data

### 🔒 Additional Security (Future Enhancements)
1. **Rate limiting** on auth endpoints
2. **Token refresh** handling (Auth0 SDK handles this)
3. **Audit logging** of role changes
4. **Email verification** requirement
5. **Session management** (revoke tokens)

### 🔒 Social Login Security

**Current Approach:**
- ✅ Google login enabled in Auth0 (auto-creates Auth0 accounts)
- ✅ Backend database check prevents unauthorized access (403 if user not in DB)
- ✅ Admin must pre-create users in database with correct email

**Why This Works:**
- Social logins (Google) are convenient for users
- Auth0 handles authentication (user identity verification)
- Your database controls authorization (who can access what)
- Even if Auth0 auto-creates accounts, backend still enforces access control

**Alternative (If You Want Stricter Control):**
- You could disable social logins in Auth0 dashboard
- Force email/password only (requires explicit signup)
- But this is less user-friendly and backend security already prevents unauthorized access

## Dependencies Needed

### Backend
```json
{
  "@nestjs/passport": "^10.0.x",
  "passport": "^0.7.x",
  "passport-jwt": "^4.0.x",
  "jwks-rsa": "^3.1.x"  // For Auth0 JWKS validation
}
```

### Frontend
```json
{
  "@auth0/auth0-vue": "^2.0.x"  // Already installed
}
```

## Configuration

### Backend Environment Variables
```env
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier  # API identifier from Auth0 dashboard
```

### Auth0 Dashboard Configuration
1. **API**: Create an API in Auth0 (for audience)
2. **Application**: Enable "Authorization Code" flow (already done)
3. **Social Connections** (optional): 
   - Google login can be enabled/disabled based on your preference
   - **Security Note**: Social logins (like Google) will auto-create Auth0 users if they don't exist
   - **Our backend protection**: Even if Auth0 auto-creates users, our database check prevents unauthorized access
   - **Recommendation**: You can enable Google login - it's convenient for users, and backend security still applies
4. **Rules/Actions** (optional): Add email to token if needed (usually included by default)

## Open Questions / Decisions Needed

1. **User creation approach**: Option 1 (admin creates in DB, user signs up in Auth0) or Option 2 (admin creates in both)?
   - **Recommendation**: **Option 1** - Simpler, no Auth0 Management API needed
   - If you need invitation emails or tighter control, use Option 2
   
2. **Email matching and unknown users**: When user logs in (via any method), what if they don't exist in database?
   - **Recommendation**: 
     - ✅ If user exists in DB with matching email and `auth0_id` is NULL, update `auth0_id` and link them
     - ✅ If user exists in DB with matching email and `auth0_id` matches Auth0 ID, proceed normally
     - ❌ **If no match found in database**: Return 403 Forbidden - "Account not authorized. Please contact an administrator."
   - **Rationale**: Access must be controlled - users must be pre-created by admin in database. This prevents unauthorized access even if:
     - Someone signs up directly in Auth0
     - Someone uses Google/social login (which auto-creates Auth0 accounts)
     - Someone uses any other authentication method
   - **Critical**: The database check is the security gate, not Auth0 signup restrictions

**Flow Diagram:**
```
User authenticates with Auth0 (login or signup)
    ↓
Auth0 returns JWT token (includes email, auth0_id/sub)
    ↓
Backend validates JWT token (verify signature, audience, expiry)
    ↓
Backend extracts email from token
    ↓
Backend queries database: SELECT * FROM users WHERE email = ?
    ↓
┌─────────────────────────┬─────────────────────────┐
│ User found in DB        │ User NOT found in DB    │
│                         │                         │
│ Check auth0_id:         │ → Return 403 Forbidden  │
│ • NULL → Update with    │   "Account not          │
│   Auth0 ID, link user   │   authorized"           │
│ • Matches → Proceed     │                         │
│ • Different → Error     │                         │
│   (security issue)      │                         │
└─────────────────────────┴─────────────────────────┘
    ↓
User object attached to request (with role)
    ↓
Role guard checks permissions
    ↓
Allow or deny access
```
   
3. **Sign up enabled**: Allow public sign-up in Auth0, or admin-created users only?
   - **Recommendation**: Enable sign-up in Auth0, but only users with matching emails in your DB can access (based on Option 1 above)
   - Alternative: Disable sign-up, require admin to create users first
   
3. **Role changes**: Allow admins to change roles, or require separate process?
   - **Recommendation**: Allow admins to change roles via UI
   
4. **User deletion**: Hard delete or soft delete?
   - **Recommendation**: Soft delete (already in schema proposal)

## Complexity Assessment

### ✅ Kept Simple
- No custom token generation (use Auth0 tokens)
- No complex role hierarchies (flat roles: viewer, editor, admin)
- Standard JWT validation (well-documented pattern)
- Database-driven roles (easy to query and manage)

### ⚠️ Not Over-Complicated
- No RBAC (Role-Based Access Control) framework
- No permissions system (roles are sufficient for now)
- No user groups or organizations
- No token refresh complexity (Auth0 SDK handles it)

## Alternative Approaches Considered

### ❌ Roles in Auth0 Metadata
- **Why not**: Requires Auth0 Management API calls, more complex
- **Why database**: Simpler queries, easier to manage, no API rate limits

### ❌ Custom JWT Generation
- **Why not**: Auth0 already generates secure tokens
- **Why Auth0 tokens**: Industry standard, well-tested, automatic refresh

### ❌ Session-based Auth
- **Why not**: Not stateless, requires session storage
- **Why JWT**: Stateless, works with Cloud Run's scaling, standard pattern

## Next Steps

1. **Review this proposal** - Does this align with your needs?
2. **Decide on open questions** - See "Open Questions" section above
3. **Start Phase 1** - Begin with backend foundation
4. **Iterate** - Build incrementally, test each phase

