import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsUUID, ValidateIf, ValidateNested } from 'class-validator'

export class ExecRosterAssignmentItemDto {
  @ApiProperty()
  @IsUUID()
  positionId!: string

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Directory person id (must be a member), or null to clear',
  })
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  personId?: string | null
}

export class ReplaceExecRosterDto {
  @ApiProperty({ type: [ExecRosterAssignmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExecRosterAssignmentItemDto)
  assignments!: ExecRosterAssignmentItemDto[]
}
