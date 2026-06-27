import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  RawBodyRequest,
} from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import { Request } from 'express'
import { EmailCampaignsService, SendGridWebhookEvent } from './email-campaigns.service'
import { SendGridService } from '../sendgrid/sendgrid.service'
import { AppConfig } from '../config/configuration'

/**
 * Public endpoint that receives SendGrid Event Webhook callbacks
 * (delivered / open / bounce / dropped / spam). Authenticated via SendGrid's
 * signed-webhook signature rather than a JWT.
 */
@ApiExcludeController()
@Controller('email-campaigns/webhook')
export class EmailCampaignsWebhookController {
  constructor(
    private readonly emailCampaignsService: EmailCampaignsService,
    private readonly sendGridService: SendGridService,
    private readonly configService: ConfigService<AppConfig>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailCampaignsWebhookController.name)
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
  ): Promise<{ applied: number }> {
    const rawBody = req.rawBody?.toString('utf8') ?? ''
    const isProduction =
      this.configService.get<AppConfig>('config', { infer: true })?.app.env === 'production'

    if (this.sendGridService.isWebhookVerificationConfigured) {
      const ok = this.sendGridService.verifyWebhookSignature(
        rawBody,
        signature ?? '',
        timestamp ?? '',
      )
      if (!ok) {
        this.logger.warn('Rejected SendGrid webhook: invalid signature')
        throw new ForbiddenException('Invalid signature')
      }
    } else if (isProduction) {
      // Fail closed in production if verification isn't configured.
      this.logger.error(
        'SendGrid webhook verification key not configured - rejecting in production',
      )
      throw new ForbiddenException('Webhook verification not configured')
    } else {
      this.logger.warn(
        'SendGrid webhook verification key not set - processing without verification (non-production)',
      )
    }

    let events: SendGridWebhookEvent[]
    try {
      const parsed = JSON.parse(rawBody)
      events = Array.isArray(parsed) ? parsed : []
    } catch {
      this.logger.warn('SendGrid webhook: could not parse body')
      return { applied: 0 }
    }

    const applied = await this.emailCampaignsService.processWebhookEvents(events)
    this.logger.info({ received: events.length, applied }, 'Processed SendGrid webhook events')
    return { applied }
  }
}
