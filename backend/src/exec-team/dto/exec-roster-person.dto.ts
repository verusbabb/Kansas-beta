import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExecRosterPersonDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Present only for the current term: public contact email for this exec role (chapter mailbox), or member email if unmapped. Omitted for historical terms.',
  })
  email?: string | null

  @ApiPropertyOptional()
  phone?: string | null

  @ApiPropertyOptional({
    description: 'Time-limited signed URL for headshot, when present',
  })
  headshotUrl?: string | null
}
