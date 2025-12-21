import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Health status of the application',
    example: 'ok',
  })
  status: string;

  @ApiProperty({
    description: 'Current server timestamp in ISO format',
    example: '2024-01-15T10:30:45.123Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Application uptime in seconds',
    example: 1234.56,
  })
  uptime: number;
}

