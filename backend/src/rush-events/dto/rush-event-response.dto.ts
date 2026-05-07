import { ApiProperty } from '@nestjs/swagger'

export class RushEventResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  displayDate!: string

  @ApiProperty({ required: false })
  description?: string

  @ApiProperty()
  icon!: string

  @ApiProperty({ required: false })
  location?: string

  @ApiProperty({ required: false })
  timeLabel?: string

  @ApiProperty()
  sortOrder!: number

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}
