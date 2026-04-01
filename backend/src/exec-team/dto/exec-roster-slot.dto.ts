import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ExecPositionPublicDto } from './exec-position-public.dto'
import { ExecRosterPersonDto } from './exec-roster-person.dto'

export class ExecRosterSlotDto {
  @ApiProperty({ type: ExecPositionPublicDto })
  position!: ExecPositionPublicDto

  @ApiPropertyOptional({
    type: ExecRosterPersonDto,
    description: 'Assigned member, if any',
  })
  person?: ExecRosterPersonDto | null
}
