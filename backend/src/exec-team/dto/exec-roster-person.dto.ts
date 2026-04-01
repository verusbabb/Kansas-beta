import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExecRosterPersonDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty({
    description:
      'Public contact email for this exec role (chapter mailbox). Falls back to member personal email if unmapped.',
  })
  email!: string

  @ApiPropertyOptional()
  phone?: string | null

  @ApiPropertyOptional({
    description: 'Time-limited signed URL for headshot, when present',
  })
  headshotUrl?: string | null
}
