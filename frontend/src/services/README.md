# Services

## API Client

The `api.ts` file provides a configured Axios instance with:

- **Base URL**: Automatically configured from environment variables
- **Request Interceptors**: 
  - Adds authentication tokens (when available)
  - Adds request ID for tracing
- **Response Interceptors**:
  - Automatic error handling
  - Toast notifications for errors
  - Consistent error formatting

## Usage

```typescript
import apiClient from '@/services/api'

// GET request
const response = await apiClient.get('/users')
const users = response.data

// POST request
const response = await apiClient.post('/users', { name: 'John' })

// With TypeScript types
interface User {
  id: string
  name: string
}

const response = await apiClient.get<User>('/users/1')
const user: User = response.data
```

## Error Handling

Errors are automatically handled by the interceptor:
- HTTP errors show toast notifications
- Network errors are caught and displayed
- All errors are logged to console for debugging

