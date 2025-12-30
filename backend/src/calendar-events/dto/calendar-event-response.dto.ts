import { ApiProperty } from '@nestjs/swagger';

export class CalendarEventResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the calendar event',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the calendar event',
    example: 'Chapter Meeting',
  })
  name!: string;

  @ApiProperty({
    description: 'Rich text description of the event (HTML)',
    example: '<p>Join us for our monthly chapter meeting.</p>',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Start date of the event (ISO date string)',
    example: '2025-01-15',
  })
  startDate!: string;

  @ApiProperty({
    description: 'End date of the event (ISO date string)',
    example: '2025-01-15',
  })
  endDate!: string;

  @ApiProperty({
    description: 'Start time of the event (HH:mm format)',
    example: '18:00',
    required: false,
  })
  startTime?: string;

  @ApiProperty({
    description: 'End time of the event (HH:mm format)',
    example: '20:00',
    required: false,
  })
  endTime?: string;

  @ApiProperty({
    description: 'Whether the event is an all-day event',
    example: false,
  })
  allDay!: boolean;

  @ApiProperty({
    description: 'Date when the event was created',
    example: '2025-01-01T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when the event was last updated',
    example: '2025-01-01T10:00:00.000Z',
  })
  updatedAt!: Date;
}

