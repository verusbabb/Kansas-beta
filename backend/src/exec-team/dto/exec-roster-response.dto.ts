import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ExecTermPublicDto } from './exec-term-public.dto'
import { ExecRosterSlotDto } from './exec-roster-slot.dto'

export class ExecRosterResponseDto {
  @ApiPropertyOptional({
    type: ExecTermPublicDto,
    description: 'Null if no terms exist yet',
  })
  term?: ExecTermPublicDto | null

  @ApiProperty({ type: [ExecRosterSlotDto] })
  slots!: ExecRosterSlotDto[]
}
