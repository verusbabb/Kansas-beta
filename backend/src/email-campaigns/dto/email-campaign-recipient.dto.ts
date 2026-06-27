import { ApiProperty } from '@nestjs/swagger'
import { RecipientStatus } from '../../database/entities/email-campaign-recipient.entity'

export class EmailCampaignRecipientDto {
  @ApiProperty() id!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() email!: string
  @ApiProperty({ enum: ['sent', 'delivered', 'opened', 'bounced', 'dropped', 'spam'] })
  status!: RecipientStatus
  @ApiProperty({ nullable: true }) deliveredAt!: string | null
  @ApiProperty({ nullable: true }) openedAt!: string | null
  @ApiProperty() openCount!: number
  @ApiProperty({ nullable: true }) bounceReason!: string | null
  @ApiProperty({ nullable: true }) lastEventAt!: string | null
}

export class CampaignRecipientsSummaryDto {
  @ApiProperty() total!: number
  @ApiProperty() delivered!: number
  @ApiProperty() opened!: number
  @ApiProperty() bounced!: number
  @ApiProperty() dropped!: number
  @ApiProperty() spam!: number
}

export class CampaignRecipientsResponseDto {
  @ApiProperty({ type: CampaignRecipientsSummaryDto })
  summary!: CampaignRecipientsSummaryDto
  @ApiProperty({ type: [EmailCampaignRecipientDto] })
  recipients!: EmailCampaignRecipientDto[]
}
