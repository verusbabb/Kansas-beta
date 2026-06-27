import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  Index,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { BaseEntity } from './base.entity'
import { EmailCampaign } from './email-campaign.entity'
import { Person } from './person.entity'

export type RecipientStatus = 'sent' | 'delivered' | 'opened' | 'bounced' | 'dropped' | 'spam'

/**
 * Per-recipient snapshot for a sent campaign. Captured at send time so the
 * "who received this" record never drifts, and updated by the SendGrid event
 * webhook with delivery / open / bounce status.
 */
@Table({
  tableName: 'email_campaign_recipients',
  timestamps: true,
  paranoid: true,
})
export class EmailCampaignRecipient extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @ForeignKey(() => EmailCampaign)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  campaignId!: string

  @BelongsTo(() => EmailCampaign, { foreignKey: 'campaignId', as: 'campaign' })
  campaign?: EmailCampaign

  @ForeignKey(() => Person)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  personId?: string | null

  @BelongsTo(() => Person, { foreignKey: 'personId', as: 'person' })
  person?: Person | null

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  firstName!: string

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  lastName!: string

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  email!: string

  @Column({
    type: DataType.ENUM('sent', 'delivered', 'opened', 'bounced', 'dropped', 'spam'),
    allowNull: false,
    defaultValue: 'sent',
  })
  status!: RecipientStatus

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deliveredAt?: Date | null

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  openedAt?: Date | null

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  openCount!: number

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bounceReason?: string | null

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastEventAt?: Date | null
}
