import { IsString, IsDateString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCalendarEventDto {
  @ApiProperty({
    description: 'Name of the calendar event',
    example: 'Chapter Meeting',
    maxLength: 255,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Rich text description of the event (HTML)',
    example: '<p>Join us for our monthly chapter meeting.</p>',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Start date of the event (ISO date string: YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsDateString({}, { message: 'Start date must be a valid date in YYYY-MM-DD format' })
  startDate!: string;

  @ApiProperty({
    description: 'End date of the event (ISO date string: YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsDateString({}, { message: 'End date must be a valid date in YYYY-MM-DD format' })
  endDate!: string;

  @ApiProperty({
    description: 'Start time of the event (HH:mm format, 24-hour)',
    example: '18:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (24-hour)',
  })
  startTime?: string;

  @ApiProperty({
    description: 'End time of the event (HH:mm format, 24-hour)',
    example: '20:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (24-hour)',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Whether the event is an all-day event',
    example: false,
    default: false,
  })
  @IsBoolean()
  allDay!: boolean;
}

