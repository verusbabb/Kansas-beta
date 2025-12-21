# Common Utilities

This directory contains shared utilities, filters, and DTOs used across the application.

## Filters

### HttpExceptionFilter
Global exception filter that:
- Catches all exceptions (HTTP and unhandled)
- Formats consistent error responses
- Logs errors with appropriate levels (warn for 4xx, error for 5xx)
- Includes request context (path, method, timestamp)

## DTOs

Example DTOs demonstrating validation decorators from `class-validator`.

## Usage

### Validation Example

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;
}
```

The global ValidationPipe will automatically validate incoming requests.

