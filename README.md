# Kansas Beta

A full-stack application for Beta Theta Pi Alpha Nu Chapter at the University of Kansas, built with NestJS backend and Vue 3 frontend, deployed to Google Cloud Platform.

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Relational database
- **Sequelize** - SQL ORM with TypeScript support
- **GCP Secret Manager** - Secure secret management
- **Docker** - Containerization
- **Swagger/OpenAPI** - API documentation

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend tooling
- **Pinia** - State management
- **PrimeVue** - UI component library (Material theme)
- **Tailwind CSS** - Utility-first CSS framework
- **Vue Router** - Official router for Vue.js
- **Axios** - HTTP client
- **Nginx** - Web server for production

## Project Structure

```
kansas-beta/
├── backend/                    # NestJS backend application
│   ├── src/
│   │   ├── config/            # Configuration & Secret Manager
│   │   ├── database/          # Sequelize models, migrations, seeders
│   │   │   ├── entities/      # Database models
│   │   │   ├── migrations/    # Database migrations
│   │   │   └── seeders/       # Database seeders
│   │   ├── health/            # Health check endpoint
│   │   ├── common/            # Shared DTOs and filters
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # Vue 3 frontend application
│   ├── src/
│   │   ├── assets/            # CSS and static assets
│   │   ├── components/        # Vue components (Header, etc.)
│   │   ├── views/             # Page views (Home, Blog)
│   │   ├── stores/            # Pinia stores (health, toast)
│   │   ├── services/          # API client and services
│   │   ├── router/            # Vue Router configuration
│   │   ├── config/              # Environment configuration
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/                # Static assets (images, etc.)
│   ├── Dockerfile
│   ├── nginx.conf             # Nginx configuration
│   ├── cloudbuild.yaml        # Frontend Cloud Build config
│   └── package.json
├── deploy.sh                   # Deployment automation script
├── check-dns.sh                # DNS propagation checker
└── README.md
```

## Local Development

### Prerequisites
- Node.js 20+ and npm
- Docker (optional, for containerized development)
- Git (for pre-commit hooks)

### Initial Setup

1. Install root dependencies (for git hooks):
```bash
npm install
```

This will install Husky and lint-staged, and set up git hooks automatically.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run start:dev
```

The backend will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Environment Variables

#### Backend
Create a `.env` file in the `backend/` directory:

```env
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database (Local PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kansas_beta
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# GCP Secret Manager (set to false for local dev)
GCP_SECRET_MANAGER_ENABLED=false
GCP_PROJECT_ID=kansas-beta
```

**Note:** For production, secrets are stored in GCP Secret Manager. See `backend/src/config/README.md` for details.

#### Frontend
Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000
```

**Note:** Frontend environment variables are baked into the build at build time. For production, use Cloud Build substitution variables (see Deployment section).

## Git Hooks (Pre-commit Linting & Formatting)

This project uses **Husky** and **lint-staged** to automatically run linting and formatting on staged files before each commit.

### How it works

When you commit code, the pre-commit hook will:
1. Run **Prettier** to format staged files
2. Run **ESLint** to check and fix linting issues
3. Only process files that are staged (efficient)
4. Prevent the commit if there are unfixable linting errors

### Setup

The git hooks are automatically set up when you run `npm install` at the root level (thanks to the `prepare` script).

### Manual Setup (if needed)

If you need to manually set up the hooks:
```bash
npm install
npx husky install
```

### Bypassing Hooks (if needed)

If you need to bypass the pre-commit hook for a specific commit:
```bash
git commit --no-verify -m "your message"
```

⚠️ **Note:** Only bypass hooks when absolutely necessary, as it skips code quality checks.

## Database Setup

### Local Development

1. Install and start PostgreSQL locally
2. Create a database:
```bash
createdb kansas_beta
```
3. The application will auto-sync tables in development mode

### Migrations & Seeders

The backend uses Sequelize migrations for production and auto-sync for development.

**Run migrations (production):**
```bash
cd backend
npm run migration:run
```

**Run migrations (development):**
```bash
cd backend
npm run migration:run:dev
```

**Generate a new migration:**
```bash
cd backend
npm run migration:generate -- your-migration-name
```

**Run seeders:**
```bash
cd backend
npm run seed:run:dev    # Development
npm run seed:run        # Production
```

See `backend/src/database/README.md` and `backend/src/database/MIGRATIONS.md` for detailed documentation.

## Building for Production

### Backend
```bash
cd backend
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm run build
```

The built files will be in the `dist/` directory.

**Note:** Frontend builds include type checking. Use `npm run build:check` if you want to verify types separately.

## Docker

### Build Backend Image
```bash
cd backend
docker build -t kansas-beta-backend .
docker run -p 3000:3000 kansas-beta-backend
```

### Build Frontend Image
```bash
cd frontend
docker build -t kansas-beta-frontend .
docker run -p 80:80 kansas-beta-frontend
```

## GCP Deployment

### Prerequisites
1. Google Cloud Platform account
2. GCP project created (`kansas-beta`)
3. `gcloud` CLI installed and authenticated
4. Billing enabled on GCP project
5. Required APIs enabled (see below)

### Initial Setup

**Quick Setup:**
Run the automated setup script:
```bash
./setup-gcp.sh
```

This will create the project, enable APIs, create the database, and set up permissions.

**Manual Setup:**

1. Set your GCP project:
```bash
gcloud config set project kansas-beta
```

2. Enable required APIs:
```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com
```

### Database Setup (PostgreSQL)

1. Create a Cloud SQL PostgreSQL instance:
```bash
gcloud sql instances create kansas-beta-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD
```

2. Create a database:
```bash
gcloud sql databases create kansas_beta \
  --instance=kansas-beta-db
```

3. Store database password in Secret Manager:
```bash
echo -n "YOUR_DATABASE_PASSWORD" | gcloud secrets create database-password \
  --data-file=- \
  --replication-policy="automatic"
```

### Secrets Setup

Store sensitive configuration in GCP Secret Manager:

```bash
# Database password (already done above)
# Database user (if different from postgres)
echo -n "postgres" | gcloud secrets create database-user \
  --data-file=- \
  --replication-policy="automatic"
```

### Quick Deployment

Use the automated deployment script:

```bash
# Deploy both backend and frontend
./deploy.sh

# Or deploy individually
./deploy.sh backend
./deploy.sh frontend
```

The script handles:
- Building Docker images
- Pushing to Container Registry
- Deploying to Cloud Run with proper configuration
- Setting up Cloud SQL connections
- Configuring environment variables

### Manual Deployment

#### Deploy Backend

1. Build and push the image:
```bash
cd backend
gcloud builds submit --tag gcr.io/kansas-beta/kansas-beta-backend
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy kansas-beta-backend \
  --image gcr.io/kansas-beta/kansas-beta-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,GCP_SECRET_MANAGER_ENABLED=true,GCP_PROJECT_ID=kansas-beta,DATABASE_HOST=/cloudsql/kansas-beta:us-central1:kansas-beta-db,DATABASE_NAME=kansas_beta \
  --add-cloudsql-instances kansas-beta:us-central1:kansas-beta-db
```

#### Deploy Frontend

1. Get backend URL:
```bash
BACKEND_URL=$(gcloud run services describe kansas-beta-backend \
  --region us-central1 \
  --format 'value(status.url)')
```

2. Build and deploy with API URL:
```bash
cd frontend
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_FRONTEND_API_URL=${BACKEND_URL}

gcloud run deploy kansas-beta-frontend \
  --image gcr.io/kansas-beta/kansas-beta-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Custom Domain Setup

To set up custom domains (optional):

1. Create domain mappings:
```bash
# Backend (replace with your domain)
gcloud run domain-mappings create \
  --service kansas-beta-backend \
  --domain api.yourdomain.com \
  --region us-central1

# Frontend (replace with your domain)
gcloud run domain-mappings create \
  --service kansas-beta-frontend \
  --domain yourdomain.com \
  --region us-central1
```

2. Get DNS records and configure in your DNS provider

3. Check DNS propagation (update check-dns.sh with your domains):
```bash
./check-dns.sh
```

### Frontend Configuration

**Important:** Frontend environment variables are baked into the build at build time, not runtime. Use Cloud Build substitution variables:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_FRONTEND_API_URL=${BACKEND_URL}
```

## Cost Optimization

This setup is optimized for free/low-cost tiers:

- **Cloud Run**: Free tier includes 2 million requests/month
- **Cloud SQL**: f1-micro instance is free (with usage limits)
- **Cloud Build**: 120 build-minutes/day free
- **Container Registry**: Free storage for images

Estimated monthly cost: **$0-5** for low-traffic applications.

## Features

### Backend Features
- ✅ Health check endpoint (`/health`) with database connection status
- ✅ PostgreSQL database with Sequelize ORM
- ✅ Database migrations and seeders
- ✅ GCP Secret Manager integration for secure configuration
- ✅ Swagger/OpenAPI documentation at `/api`
- ✅ Structured logging with Pino
- ✅ CORS configuration for frontend
- ✅ Type-safe configuration with validation

### Frontend Features
- ✅ Responsive design with PrimeVue Material theme
- ✅ Health check integration with loading states
- ✅ Contact modal with email and LinkedIn links
- ✅ Toast notifications for user feedback
- ✅ Modern UI with Tailwind CSS
- ✅ Type-safe API client with Axios
- ✅ State management with Pinia

### Health Check

The backend includes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

The frontend includes a "DB Connection Check" button in the header that:
- Shows a loading toast during the request
- Displays success/error messages via PrimeVue toasts
- Handles cold start delays gracefully

## Development Scripts

### Root Level
- `npm install` - Install dependencies and set up git hooks

### Backend
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run migration:generate -- <name>` - Generate a new migration
- `npm run migration:run:dev` - Run migrations (development)
- `npm run migration:run` - Run migrations (production)
- `npm run seed:run:dev` - Run seeders (development)
- `npm run seed:run` - Run seeders (production)

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:check` - Type check and build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project URLs

After deployment, get your service URLs:
```bash
# Frontend URL
gcloud run services describe kansas-beta-frontend \
  --region us-central1 \
  --format 'value(status.url)'

# Backend URL
gcloud run services describe kansas-beta-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

The API documentation will be available at: `{BACKEND_URL}/api`

## Additional Documentation

- **Backend Configuration**: `backend/src/config/README.md`
- **Database Migrations**: `backend/src/database/MIGRATIONS.md`
- **Database Module**: `backend/src/database/README.md`

## License

UNLICENSED
