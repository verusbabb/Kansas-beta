import { ApiProperty } from '@nestjs/swagger'
import {
  EmailAudienceType,
  EmailCampaignStatus,
} from '../../database/entities/email-campaign.entity'

export class EmailCampaignSummaryDto {
  @ApiProperty() id!: string
  @ApiProperty() subject!: string
  @ApiProperty() audienceType!: EmailAudienceType
  @ApiProperty({ type: [Number], nullable: true }) audienceClassYears!: number[] | null
  @ApiProperty() audienceIncludeMembers!: boolean
  @ApiProperty() audienceIncludeParents!: boolean
  @ApiProperty() status!: EmailCampaignStatus
  @ApiProperty({ nullable: true }) sentAt!: string | null
  @ApiProperty({ nullable: true }) recipientCount!: number | null
  @ApiProperty({ nullable: true }) createdByName!: string | null
  @ApiProperty() createdAt!: string
  @ApiProperty() updatedAt!: string
}
