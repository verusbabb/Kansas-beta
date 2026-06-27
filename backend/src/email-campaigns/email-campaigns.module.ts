import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { EmailCampaignsController } from './email-campaigns.controller'
import { EmailCampaignsWebhookController } from './email-campaigns-webhook.controller'
import { EmailCampaignsService } from './email-campaigns.service'
import { EmailCampaign } from '../database/entities/email-campaign.entity'
import { EmailCampaignRecipient } from '../database/entities/email-campaign-recipient.entity'
import { Person } from '../database/entities/person.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { User } from '../database/entities/user.entity'
import { AuthModule } from '../auth/auth.module'
import { SendGridModule } from '../sendgrid/sendgrid.module'

@Module({
  imports: [
    SequelizeModule.forFeature([
      EmailCampaign,
      EmailCampaignRecipient,
      Person,
      PersonRelationship,
      User,
    ]),
    AuthModule,
    SendGridModule,
  ],
  controllers: [EmailCampaignsController, EmailCampaignsWebhookController],
  providers: [EmailCampaignsService],
  exports: [EmailCampaignsService],
})
export class EmailCampaignsModule {}
