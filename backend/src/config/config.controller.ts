import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

/**
 * Public configuration endpoint for frontend
 * Returns non-sensitive configuration that the frontend needs
 */
@ApiTags('Config')
@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService<AppConfig>) {}

  @Get()
  @ApiOperation({
    summary: 'Get public configuration',
    description: 'Returns non-sensitive configuration for the frontend (API URLs, feature flags, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Public configuration',
    schema: {
      type: 'object',
      properties: {
        apiUrl: { type: 'string', example: 'http://localhost:3000' },
        appName: { type: 'string', example: 'Kansas Beta' },
        appVersion: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  getPublicConfig() {
    const config = this.configService.get<AppConfig>('config', { infer: true })!;

    // Only return non-sensitive configuration
    return {
      apiUrl: config.frontend.url.replace('/api', ''), // Frontend needs backend URL
      appName: config.app.name,
      environment: config.app.env,
      // Add feature flags, public settings, etc. here
      // Never include: secrets, API keys, database info, etc.
    };
  }
}

