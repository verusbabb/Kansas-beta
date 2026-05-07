import { ApiProperty } from '@nestjs/swagger'

export class RushPageWidgetResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ description: 'Fixed slot 0–3 on /rush' })
  slotIndex!: number

  @ApiProperty()
  title!: string

  @ApiProperty({ required: false })
  bodyHtml?: string

  @ApiProperty()
  updatedAt!: Date
}
