import { PartialType } from '@nestjs/swagger'
import { CreateEmailCampaignDto } from './create-email-campaign.dto'

/**
 * All fields optional. Only draft campaigns may be updated (enforced in service).
 */
export class UpdateEmailCampaignDto extends PartialType(CreateEmailCampaignDto) {}
