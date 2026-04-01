import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PersonResponseDto } from './person-response.dto'
import { PersonRelationshipResponseDto } from '../../person-relationships/dto/person-relationship-response.dto'
import { PersonExecHistoryEntryDto } from '../../exec-team/dto/person-exec-history-entry.dto'

export class PersonProfileResponseDto {
  @ApiProperty({ type: PersonResponseDto })
  person!: PersonResponseDto

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Time-limited signed URL for headshot when `person.hasHeadshot` (same TTL as exec roster).',
  })
  headshotUrl?: string | null

  @ApiProperty({ type: [PersonRelationshipResponseDto] })
  relationships!: PersonRelationshipResponseDto[]

  @ApiProperty({ type: [PersonExecHistoryEntryDto] })
  execHistory!: PersonExecHistoryEntryDto[]
}
