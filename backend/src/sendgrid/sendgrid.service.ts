import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import * as crypto from 'crypto'
import * as SendGrid from '@sendgrid/mail'

export interface SendRushConfirmationParams {
  to: string
  firstName: string
  lastName: string
}

export interface CampaignRecipient {
  /** Our email_campaign_recipients row id — returned on webhook events as a custom arg. */
  recipientId: string
  email: string
}

export interface SendCampaignParams {
  campaignId: string
  recipients: CampaignRecipient[]
  subject: string
  bodyHtml: string
}

/** Max recipients per SendGrid API request (personalizations limit is 1000). */
const CAMPAIGN_BATCH_SIZE = 900

@Injectable()
export class SendGridService {
  private readonly apiKey: string
  private readonly rushConfirmationTemplateId: string
  private readonly fromEmail: string
  private readonly fromName: string
  private readonly rushNotificationEmail: string
  private readonly webhookVerificationKey: string

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
    this.webhookVerificationKey =
      this.configService.get<string>('config.sendgrid.webhookVerificationKey') ?? ''

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

  /**
   * Send a campaign email to many recipients. Each recipient is sent an
   * individual message (via personalizations) so addresses are never shared
   * between recipients. Requests are chunked to respect SendGrid limits.
   *
   * Throws if SendGrid is not configured (the caller blocks the send so the
   * campaign isn't marked as sent when it wasn't).
   */
  async sendCampaign(params: SendCampaignParams): Promise<{ sent: number }> {
    const { campaignId, recipients, subject, bodyHtml } = params

    if (!this.apiKey) {
      throw new Error('SendGrid API key not configured')
    }
    if (!this.fromEmail) {
      throw new Error('SendGrid from email not configured')
    }

    if (recipients.length === 0) {
      return { sent: 0 }
    }

    const html = this.wrapInBrandedTemplate(bodyHtml)
    let sent = 0

    for (let i = 0; i < recipients.length; i += CAMPAIGN_BATCH_SIZE) {
      const chunk = recipients.slice(i, i + CAMPAIGN_BATCH_SIZE)
      const message: SendGrid.MailDataRequired = {
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        html,
        // Per-recipient personalization keeps addresses private and lets us
        // tag each message with custom args we get back on webhook events.
        personalizations: chunk.map((r) => ({
          to: [{ email: r.email }],
          customArgs: { campaignId, recipientId: r.recipientId },
        })),
        trackingSettings: {
          openTracking: { enable: true },
        },
      }

      await SendGrid.send(message)
      sent += chunk.length
    }

    this.logger.info({ sent, subject }, 'Campaign email sent')
    return { sent }
  }

  /** Whether signed-webhook verification is configured. */
  get isWebhookVerificationConfigured(): boolean {
    return this.webhookVerificationKey.length > 0
  }

  /**
   * Verify a SendGrid Event Webhook request using the ECDSA signed-webhook key.
   * `rawPayload` MUST be the exact request body bytes SendGrid signed.
   */
  verifyWebhookSignature(rawPayload: string, signature: string, timestamp: string): boolean {
    if (!this.webhookVerificationKey) return false
    if (!signature || !timestamp) return false

    try {
      const publicKey = crypto.createPublicKey({
        key: Buffer.from(this.webhookVerificationKey, 'base64'),
        format: 'der',
        type: 'spki',
      })
      const verifier = crypto.createVerify('sha256')
      verifier.update(timestamp + rawPayload)
      verifier.end()
      return verifier.verify(publicKey, Buffer.from(signature, 'base64'))
    } catch (error) {
      this.logger.warn({ error }, 'SendGrid webhook signature verification error')
      return false
    }
  }

  /**
   * Wrap rich-text body HTML in a simple, email-client-friendly branded layout.
   * Uses inline styles and a single-column table for broad compatibility.
   */
  private wrapInBrandedTemplate(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background-color:#6F8FAF;padding:20px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;">Beta Theta Pi &mdash; Alpha Nu</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:16px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
                Beta Theta Pi, Alpha Nu Chapter &middot; University of Kansas<br />
                <a href="https://kansasbeta.org" style="color:#6F8FAF;text-decoration:none;">kansasbeta.org</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  }
}
