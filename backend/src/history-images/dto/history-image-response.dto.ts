import { ApiProperty } from '@nestjs/swagger'

export class HistoryImageResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() filePath!: string
  @ApiProperty({ required: false }) caption?: string
  @ApiProperty({ required: false }) altText?: string
  @ApiProperty() sortOrder!: number
  @ApiProperty() uploadedBy!: string
  @ApiProperty() createdAt!: Date
  @ApiProperty() updatedAt!: Date
}
