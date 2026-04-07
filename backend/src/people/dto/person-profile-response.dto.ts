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
      'Time-limited signed URL for the directory/profile photo when `person.hasProfileHeadshot`.',
  })
  headshotUrl?: string | null

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Time-limited signed URL for the exec roster photo when `person.hasExecRosterHeadshot`.',
  })
  execRosterHeadshotUrl?: string | null

  @ApiProperty({ type: [PersonRelationshipResponseDto] })
  relationships!: PersonRelationshipResponseDto[]

  @ApiProperty({ type: [PersonExecHistoryEntryDto] })
  execHistory!: PersonExecHistoryEntryDto[]
}
