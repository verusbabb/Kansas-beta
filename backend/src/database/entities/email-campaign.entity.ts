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
import { User } from './user.entity'

export type EmailAudienceType =
  'everyone' | 'all_members' | 'all_parents' | 'class_years' | 'custom'

export type EmailCampaignStatus = 'draft' | 'sent'

@Table({
  tableName: 'email_campaigns',
  timestamps: true,
  paranoid: true,
})
export class EmailCampaign extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  subject!: string

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  bodyHtml!: string

  @Column({
    type: DataType.ENUM('everyone', 'all_members', 'all_parents', 'class_years', 'custom'),
    allowNull: false,
  })
  audienceType!: EmailAudienceType

  /** Pledge class years for audienceType 'class_years'. */
  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  audienceClassYears?: number[] | null

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  audienceIncludeMembers!: boolean

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  audienceIncludeParents!: boolean

  /** Specific person UUIDs for audienceType 'custom'. */
  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  audiencePersonIds?: string[] | null

  @Index
  @Column({
    type: DataType.ENUM('draft', 'sent'),
    allowNull: false,
    defaultValue: 'draft',
  })
  status!: EmailCampaignStatus

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sentAt?: Date | null

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  recipientCount?: number | null

  @ForeignKey(() => User)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  createdByUserId?: string | null

  @BelongsTo(() => User, { foreignKey: 'createdByUserId', as: 'createdBy' })
  createdBy?: User | null
}
