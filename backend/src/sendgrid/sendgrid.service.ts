import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import * as SendGrid from '@sendgrid/mail'

export interface SendRushConfirmationParams {
  to: string
  firstName: string
  lastName: string
}

@Injectable()
export class SendGridService {
  private readonly apiKey: string
  private readonly rushConfirmationTemplateId: string
  private readonly fromEmail: string
  private readonly fromName: string
  private readonly rushNotificationEmail: string

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SendGridService.name)

    this.apiKey = this.configService.get<string>('config.sendgrid.apiKey') ?? ''
    this.rushConfirmationTemplateId =
      this.configService.get<string>('config.sendgrid.rushConfirmationTemplateId') ?? ''
    this.fromEmail = this.configService.get<string>('config.sendgrid.fromEmail') ?? ''
    this.fromName = this.configService.get<string>('config.sendgrid.fromName') ?? 'Kansas Beta'
    this.rushNotificationEmail =
      this.configService.get<string>('config.sendgrid.rushNotificationEmail') ?? ''

    if (this.apiKey) {
      SendGrid.setApiKey(this.apiKey)
      this.logger.info('SendGrid initialized')
    } else {
      this.logger.warn('SendGrid API key not configured - email sending will be disabled')
    }
  }

  /**
   * Send rush application confirmation email using SendGrid dynamic template.
   * Gracefully degrades if SendGrid is not configured.
   */
  async sendRushConfirmation(params: SendRushConfirmationParams): Promise<void> {
    const { to, firstName, lastName } = params

    if (!this.apiKey) {
      this.logger.warn({ to }, 'SendGrid not configured - skipping rush confirmation email')
      return
    }

    if (!this.rushConfirmationTemplateId) {
      this.logger.warn({ to }, 'Rush confirmation template ID not configured - skipping email')
      return
    }

    if (!this.fromEmail) {
      this.logger.warn({ to }, 'SendGrid from email not configured - skipping email')
      return
    }

    try {
      const mailOptions: SendGrid.MailDataRequired = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId: this.rushConfirmationTemplateId,
        dynamicTemplateData: {
          firstName,
          lastName,
        },
      }

      // BCC rush chair if configured
      if (this.rushNotificationEmail) {
        mailOptions.bcc = this.rushNotificationEmail
      }

      await SendGrid.send(mailOptions)

      this.logger.info({ to, firstName, lastName }, 'Rush confirmation email sent')
    } catch (error) {
      this.logger.error(
        { error, to, firstName, lastName },
        'Failed to send rush confirmation email',
      )
      // Don't throw - email failures shouldn't block application submission
    }
  }
}
