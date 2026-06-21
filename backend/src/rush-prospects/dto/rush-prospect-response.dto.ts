import { ApiProperty } from '@nestjs/swagger'
import { RushProspectSummaryDto } from './rush-prospect-summary.dto'
import { RushProspectActivityResponseDto } from './rush-prospect-activity-response.dto'

export class RushProspectResponseDto extends RushProspectSummaryDto {
  @ApiProperty({ nullable: true }) hometown!: string | null
  @ApiProperty({ nullable: true }) highSchool!: string | null
  @ApiProperty({ nullable: true }) major!: string | null
  @ApiProperty({ nullable: true }) gpa!: number | null
  @ApiProperty({ nullable: true }) actScore!: number | null
  @ApiProperty({ nullable: true }) satScore!: number | null
  @ApiProperty({ nullable: true }) sportsActivities!: string | null
  @ApiProperty({ nullable: true }) honorsAwards!: string | null
  @ApiProperty({ nullable: true }) legacyRelativePersonId!: string | null
  @ApiProperty({ nullable: true }) legacyRelativeName!: string | null
  @ApiProperty({ nullable: true }) legacyRelationship!: string | null
  /** Resolved full name from the people table when legacyRelativePersonId is set */
  @ApiProperty({ nullable: true }) legacyRelativeFullName!: string | null
  @ApiProperty({ nullable: true }) referralSource!: string | null
  @ApiProperty({ type: [RushProspectActivityResponseDto] }) activities!: RushProspectActivityResponseDto[]
}

export class MemberLegacySearchResultDto {
  @ApiProperty() id!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
}
