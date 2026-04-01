import { ApiProperty } from '@nestjs/swagger'
import { ExecTermPublicDto } from './exec-term-public.dto'
import { ExecPositionPublicDto } from './exec-position-public.dto'

export class PersonExecHistoryEntryDto {
  @ApiProperty({ type: ExecTermPublicDto })
  term!: ExecTermPublicDto

  @ApiProperty({ type: ExecPositionPublicDto })
  position!: ExecPositionPublicDto
}
