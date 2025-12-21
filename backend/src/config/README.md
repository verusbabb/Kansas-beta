# Configuration Management

This directory contains the configuration system for the NestJS backend.

## Features

- ✅ Type-safe configuration
- ✅ Environment variable validation
- ✅ Support for `.env` files (local development)
- ✅ Support for GCP Secret Manager (production)
- ✅ Global config access throughout the app

## Usage

### In Services/Controllers

```typescript
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/config/configuration';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService<AppConfig>) {}

  someMethod() {
    const config = this.configService.get<AppConfig>('config', { infer: true })!;
    
    // Access config values
    const port = config.app.port;
    const dbHost = config.database.host;
  }
}
```

### Direct Access

```typescript
// Get specific value
const port = configService.get('config.app.port');

// Get entire config
const config = configService.get<AppConfig>('config', { infer: true });
```

## Environment Variables

### Local Development

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
# Edit .env with your values
```

### GCP Deployment

#### Option 1: Cloud Run Environment Variables (Recommended for non-sensitive)

Set in Cloud Run:
```bash
gcloud run services update verusware-backend \
  --set-env-vars NODE_ENV=production,FRONTEND_URL=https://your-frontend-url.com
```

#### Option 2: GCP Secret Manager (Recommended for sensitive secrets)

1. Store secrets in Secret Manager
2. Set `GCP_SECRET_MANAGER_ENABLED=true`
3. Set `GCP_PROJECT_ID=your-project-id`
4. Use the helper functions in `secrets/gcp-secret-manager.ts`

See `secrets/README.md` for detailed instructions.

## Adding New Configuration

1. Add to `config.schema.ts` with validation decorators
2. Add to `configuration.ts` to map to config object
3. Update `.env.example` with the new variable
4. Use in your code via `ConfigService`

## Validation

All environment variables are validated on startup. If validation fails, the application will not start and show clear error messages.

