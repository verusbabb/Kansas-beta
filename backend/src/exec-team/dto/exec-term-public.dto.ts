import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExecTermPublicDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  year!: number

  @ApiProperty({ enum: ['fall', 'spring'] })
  season!: 'fall' | 'spring'

  @ApiPropertyOptional()
  label?: string | null

  @ApiProperty()
  isCurrent!: boolean
}
