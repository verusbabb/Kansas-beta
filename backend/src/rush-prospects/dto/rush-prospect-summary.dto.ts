import { ApiProperty } from '@nestjs/swagger'

export class RushProspectSummaryDto {
  @ApiProperty() id!: string
  @ApiProperty() rushYear!: number
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() email!: string
  @ApiProperty({ nullable: true }) phone!: string | null
  @ApiProperty({ nullable: true }) hometown!: string | null
  @ApiProperty({ nullable: true }) classYear!: string | null
  @ApiProperty({ nullable: true }) enrollmentSemester!: string | null
  @ApiProperty({ nullable: true }) enrollmentYear!: number | null
  @ApiProperty({ description: 'True when the prospect has a legacy relative recorded' })
  isLegacy!: boolean
  @ApiProperty() pipelineStage!: string
  @ApiProperty({ nullable: true }) internalRating!: number | null
  @ApiProperty({ nullable: true }) assignedToPersonId!: string | null
  @ApiProperty({ nullable: true }) assignedToPersonName!: string | null
  @ApiProperty({ nullable: true }) applicationSubmittedAt!: string | null
  @ApiProperty({ nullable: true }) lastStageChangedAt!: string | null
  @ApiProperty() createdAt!: string
}
