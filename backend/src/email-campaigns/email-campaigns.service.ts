import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { EmailCampaign } from '../database/entities/email-campaign.entity'
import {
  EmailCampaignRecipient,
  RecipientStatus,
} from '../database/entities/email-campaign-recipient.entity'
import { Person } from '../database/entities/person.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { User } from '../database/entities/user.entity'
import { SendGridService } from '../sendgrid/sendgrid.service'
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto'
import { UpdateEmailCampaignDto } from './dto/update-email-campaign.dto'
import { EmailCampaignSummaryDto } from './dto/email-campaign-summary.dto'
import { EmailCampaignResponseDto } from './dto/email-campaign-response.dto'
import { PreviewRecipientsDto, PreviewRecipientsResponseDto } from './dto/preview-recipients.dto'
import {
  EmailCampaignRecipientDto,
  CampaignRecipientsResponseDto,
} from './dto/email-campaign-recipient.dto'

/** A single SendGrid Event Webhook event (only the fields we use). */
export interface SendGridWebhookEvent {
  email?: string
  timestamp?: number
  event?: string
  reason?: string
  type?: string
  // Custom args we attach at send time
  campaignId?: string
  recipientId?: string
}

/** Shape of an audience definition shared by create/update/preview. */
interface AudienceDefinition {
  audienceType: 'everyone' | 'all_members' | 'all_parents' | 'class_years' | 'custom'
  audienceClassYears?: number[] | null
  audienceIncludeMembers?: boolean | null
  audienceIncludeParents?: boolean | null
  audiencePersonIds?: string[] | null
}

@Injectable()
export class EmailCampaignsService {
  constructor(
    @InjectModel(EmailCampaign) private campaignModel: typeof EmailCampaign,
    @InjectModel(EmailCampaignRecipient)
    private recipientModel: typeof EmailCampaignRecipient,
    @InjectModel(Person) private personModel: typeof Person,
    @InjectModel(PersonRelationship)
    private relationshipModel: typeof PersonRelationship,
    private readonly sendGridService: SendGridService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailCampaignsService.name)
  }

  // ── Audience resolution ────────────────────────────────────────────────────

  /**
   * Resolve an audience definition to the set of Person rows that should receive
   * the email. Only people with a non-empty personalEmail are included.
   */
  private async resolveRecipients(def: AudienceDefinition): Promise<Person[]> {
    const includeMembers = def.audienceIncludeMembers ?? true
    const includeParents = def.audienceIncludeParents ?? false

    switch (def.audienceType) {
      case 'everyone':
        return this.personModel.findAll({
          where: {
            [Op.or]: [{ isMember: true }, { isParent: true }],
          },
        })

      case 'all_members':
        return this.personModel.findAll({ where: { isMember: true } })

      case 'all_parents':
        return this.personModel.findAll({ where: { isParent: true } })

      case 'class_years': {
        const years = def.audienceClassYears ?? []
        if (years.length === 0) return []

        const recipientIds = new Set<string>()

        // Members of the selected pledge class years
        if (includeMembers) {
          const members = await this.personModel.findAll({
            where: {
              isMember: true,
              pledgeClassYear: { [Op.in]: years },
            },
            attributes: ['id'],
          })
          members.forEach((m) => recipientIds.add(m.id))
        }

        // Parents of members of the selected pledge class years.
        // Relationships are stored as fromPerson = parent, toPerson = member.
        if (includeParents) {
          const members = await this.personModel.findAll({
            where: {
              isMember: true,
              pledgeClassYear: { [Op.in]: years },
            },
            attributes: ['id'],
          })
          const memberIds = members.map((m) => m.id)
          if (memberIds.length > 0) {
            const rels = await this.relationshipModel.findAll({
              where: {
                relationshipType: 'parent',
                toPersonId: { [Op.in]: memberIds },
              },
              attributes: ['fromPersonId'],
            })
            rels.forEach((r) => recipientIds.add(r.fromPersonId))
          }
        }

        if (recipientIds.size === 0) return []
        return this.personModel.findAll({
          where: { id: { [Op.in]: Array.from(recipientIds) } },
        })
      }

      case 'custom': {
        const ids = def.audiencePersonIds ?? []
        if (ids.length === 0) return []
        return this.personModel.findAll({
          where: { id: { [Op.in]: ids } },
        })
      }

      default:
        return []
    }
  }

  /** De-duplicate resolved people by email (first person wins per address). */
  private dedupeByEmail(people: Person[]): Person[] {
    const seen = new Set<string>()
    const unique: Person[] = []
    for (const p of people) {
      const email = p.personalEmail?.trim().toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      unique.push(p)
    }
    return unique
  }

  async previewRecipients(dto: PreviewRecipientsDto): Promise<PreviewRecipientsResponseDto> {
    const people = await this.resolveRecipients(dto)
    // De-duplicate by email to reflect what will actually be sent
    const seen = new Set<string>()
    const unique: Person[] = []
    for (const p of people) {
      const email = p.personalEmail?.trim().toLowerCase()
      if (!email || seen.has(email)) continue
      seen.add(email)
      unique.push(p)
    }

    const sample = unique.slice(0, 5).map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.personalEmail,
    }))

    return { count: unique.length, sample }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateEmailCampaignDto, user?: User): Promise<EmailCampaignResponseDto> {
    const campaign = await this.campaignModel.create({
      subject: dto.subject.trim(),
      bodyHtml: dto.bodyHtml,
      audienceType: dto.audienceType,
      audienceClassYears: dto.audienceClassYears ?? null,
      audienceIncludeMembers: dto.audienceIncludeMembers ?? true,
      audienceIncludeParents: dto.audienceIncludeParents ?? false,
      audiencePersonIds: dto.audiencePersonIds ?? null,
      status: 'draft',
      createdByUserId: user?.id ?? null,
    })
    this.logger.info({ campaignId: campaign.id }, 'Email campaign draft created')
    return this.toResponseDto(await this.reload(campaign.id))
  }

  async findAll(): Promise<EmailCampaignSummaryDto[]> {
    const campaigns = await this.campaignModel.findAll({
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    })
    return campaigns.map((c) => this.toSummaryDto(c))
  }

  async findOne(id: string): Promise<EmailCampaignResponseDto> {
    const campaign = await this.reload(id)
    return this.toResponseDto(campaign)
  }

  async update(id: string, dto: UpdateEmailCampaignDto): Promise<EmailCampaignResponseDto> {
    const campaign = await this.campaignModel.findByPk(id)
    if (!campaign) throw new NotFoundException('Campaign not found')
    if (campaign.status === 'sent') {
      throw new BadRequestException('Sent campaigns cannot be edited')
    }

    await campaign.update({
      ...(dto.subject !== undefined && { subject: dto.subject.trim() }),
      ...(dto.bodyHtml !== undefined && { bodyHtml: dto.bodyHtml }),
      ...(dto.audienceType !== undefined && { audienceType: dto.audienceType }),
      ...(dto.audienceClassYears !== undefined && {
        audienceClassYears: dto.audienceClassYears ?? null,
      }),
      ...(dto.audienceIncludeMembers !== undefined && {
        audienceIncludeMembers: dto.audienceIncludeMembers,
      }),
      ...(dto.audienceIncludeParents !== undefined && {
        audienceIncludeParents: dto.audienceIncludeParents,
      }),
      ...(dto.audiencePersonIds !== undefined && {
        audiencePersonIds: dto.audiencePersonIds ?? null,
      }),
    })

    return this.toResponseDto(await this.reload(id))
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.campaignModel.findByPk(id)
    if (!campaign) throw new NotFoundException('Campaign not found')
    await campaign.destroy()
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async send(id: string): Promise<EmailCampaignResponseDto> {
    const campaign = await this.campaignModel.findByPk(id)
    if (!campaign) throw new NotFoundException('Campaign not found')
    if (campaign.status === 'sent') {
      throw new BadRequestException('Campaign has already been sent')
    }

    const resolved = await this.resolveRecipients({
      audienceType: campaign.audienceType,
      audienceClassYears: campaign.audienceClassYears,
      audienceIncludeMembers: campaign.audienceIncludeMembers,
      audienceIncludeParents: campaign.audienceIncludeParents,
      audiencePersonIds: campaign.audiencePersonIds,
    })
    const people = this.dedupeByEmail(resolved)

    if (people.length === 0) {
      throw new BadRequestException('This audience resolves to zero recipients')
    }

    // Snapshot the recipient list at send time so "who received this" never drifts.
    const recipientRows = await this.recipientModel.bulkCreate(
      people.map((p) => ({
        campaignId: campaign.id,
        personId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.personalEmail!.trim().toLowerCase(),
        status: 'sent' as RecipientStatus,
      })),
    )

    try {
      const { sent } = await this.sendGridService.sendCampaign({
        campaignId: campaign.id,
        recipients: recipientRows.map((r) => ({ recipientId: r.id, email: r.email })),
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
      })

      await campaign.update({
        status: 'sent',
        sentAt: new Date(),
        recipientCount: sent,
      })

      this.logger.info({ campaignId: campaign.id, sent }, 'Email campaign sent')
      return this.toResponseDto(await this.reload(id))
    } catch (error) {
      // Roll back the snapshot so a failed send can be retried cleanly.
      await this.recipientModel.destroy({ where: { campaignId: campaign.id }, force: true })
      this.logger.error({ error, campaignId: campaign.id }, 'Email campaign send failed')
      throw error
    }
  }

  // ── Recipients + delivery/open tracking ──────────────────────────────────────

  async getRecipients(id: string): Promise<CampaignRecipientsResponseDto> {
    const campaign = await this.campaignModel.findByPk(id)
    if (!campaign) throw new NotFoundException('Campaign not found')

    const rows = await this.recipientModel.findAll({
      where: { campaignId: id },
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })

    const recipients: EmailCampaignRecipientDto[] = rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      status: r.status,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      openedAt: r.openedAt?.toISOString() ?? null,
      openCount: r.openCount,
      bounceReason: r.bounceReason ?? null,
      lastEventAt: r.lastEventAt?.toISOString() ?? null,
    }))

    const summary = {
      total: recipients.length,
      delivered: recipients.filter((r) => r.deliveredAt != null).length,
      opened: recipients.filter((r) => r.openedAt != null).length,
      bounced: recipients.filter((r) => r.status === 'bounced').length,
      dropped: recipients.filter((r) => r.status === 'dropped').length,
      spam: recipients.filter((r) => r.status === 'spam').length,
    }

    return { summary, recipients }
  }

  /**
   * Apply a batch of SendGrid event-webhook events to recipient rows.
   * Each event is matched by our `recipientId` custom arg (preferred) or by
   * campaignId + email. Unknown events are ignored.
   */
  async processWebhookEvents(events: SendGridWebhookEvent[]): Promise<number> {
    let applied = 0

    for (const event of events) {
      const recipient = await this.findRecipientForEvent(event)
      if (!recipient) continue

      const eventAt = event.timestamp ? new Date(event.timestamp * 1000) : new Date()
      const changes: Partial<EmailCampaignRecipient> = { lastEventAt: eventAt }

      switch (event.event) {
        case 'delivered':
          changes.deliveredAt = recipient.deliveredAt ?? eventAt
          if (recipient.status === 'sent') changes.status = 'delivered'
          break
        case 'open':
          changes.openCount = (recipient.openCount ?? 0) + 1
          changes.openedAt = recipient.openedAt ?? eventAt
          // Don't overwrite a terminal failure status with "opened".
          if (recipient.status === 'sent' || recipient.status === 'delivered') {
            changes.status = 'opened'
          }
          break
        case 'bounce':
          changes.status = 'bounced'
          changes.bounceReason = event.reason ?? event.type ?? 'Bounced'
          break
        case 'dropped':
          changes.status = 'dropped'
          changes.bounceReason = event.reason ?? 'Dropped'
          break
        case 'spamreport':
          changes.status = 'spam'
          break
        default:
          continue
      }

      await recipient.update(changes)
      applied++
    }

    return applied
  }

  private async findRecipientForEvent(
    event: SendGridWebhookEvent,
  ): Promise<EmailCampaignRecipient | null> {
    if (event.recipientId) {
      const byId = await this.recipientModel.findByPk(event.recipientId)
      if (byId) return byId
    }
    if (event.campaignId && event.email) {
      return this.recipientModel.findOne({
        where: { campaignId: event.campaignId, email: event.email.trim().toLowerCase() },
      })
    }
    return null
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async reload(id: string): Promise<EmailCampaign> {
    const campaign = await this.campaignModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
    })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return campaign
  }

  private toSummaryDto(c: EmailCampaign): EmailCampaignSummaryDto {
    const createdBy = c.createdBy as (User & { firstName: string; lastName: string }) | null
    return {
      id: c.id,
      subject: c.subject,
      audienceType: c.audienceType,
      audienceClassYears: c.audienceClassYears ?? null,
      audienceIncludeMembers: c.audienceIncludeMembers,
      audienceIncludeParents: c.audienceIncludeParents,
      status: c.status,
      sentAt: c.sentAt?.toISOString() ?? null,
      recipientCount: c.recipientCount ?? null,
      createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  private toResponseDto(c: EmailCampaign): EmailCampaignResponseDto {
    return {
      ...this.toSummaryDto(c),
      bodyHtml: c.bodyHtml,
      audiencePersonIds: c.audiencePersonIds ?? null,
    }
  }
}
