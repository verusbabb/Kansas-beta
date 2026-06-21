import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateRushProspectActivityDto {
  @ApiProperty({
    enum: ['note', 'event_attended', 'call_logged'],
    description: 'Type of activity to log. Stage changes are logged automatically on PATCH.',
  })
  @IsEnum(['note', 'event_attended', 'call_logged'])
  activityType!: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({
    required: false,
    description: 'UUID of the rush event (required when activityType is event_attended)',
  })
  @IsOptional()
  @IsUUID()
  rushEventId?: string
}
