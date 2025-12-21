import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HealthController.name);
  }

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the application including uptime and timestamp',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthResponseDto,
  })
  check(): HealthResponseDto {
    const uptime = process.uptime();
    const healthData: HealthResponseDto = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime,
    };

    this.logger.debug('Health check requested', {
      uptime,
      timestamp: healthData.timestamp,
    });

    return healthData;
  }
}

