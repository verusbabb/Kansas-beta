import { ApiProperty } from '@nestjs/swagger'
import { EmailCampaignSummaryDto } from './email-campaign-summary.dto'

export class EmailCampaignResponseDto extends EmailCampaignSummaryDto {
  @ApiProperty() bodyHtml!: string
  @ApiProperty({ type: [String], nullable: true }) audiencePersonIds!: string[] | null
}
