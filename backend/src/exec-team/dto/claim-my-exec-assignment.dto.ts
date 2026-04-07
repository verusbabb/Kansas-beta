import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator'

export class ClaimMyExecAssignmentDto {
  @ApiProperty()
  @IsUUID()
  positionId!: string

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @ApiProperty({ enum: ['fall', 'spring'] })
  @IsIn(['fall', 'spring'])
  season!: 'fall' | 'spring'
}
