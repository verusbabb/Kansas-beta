import { ApiProperty } from '@nestjs/swagger'

export class RushProspectActivityResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() prospectId!: string
  @ApiProperty() activityType!: string
  @ApiProperty({ nullable: true }) note!: string | null
  @ApiProperty({ nullable: true }) fromStage!: string | null
  @ApiProperty({ nullable: true }) toStage!: string | null
  @ApiProperty({ nullable: true }) rushEventId!: string | null
  @ApiProperty({ nullable: true }) rushEventTitle!: string | null
  @ApiProperty({ nullable: true }) createdByUserId!: string | null
  @ApiProperty({ nullable: true }) createdByName!: string | null
  @ApiProperty() createdAt!: string
}
