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
import { Model } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { RushProspect } from './rush-prospect.entity'
import { RushEvent } from './rush-event.entity'
import { User } from './user.entity'

export type ActivityType =
  | 'application_received'
  | 'stage_change'
  | 'note'
  | 'event_attended'
  | 'call_logged'
  | 'bid_extended'
  | 'bid_accepted'
  | 'bid_declined'

/** Append-only activity log — no updatedAt, no paranoid soft-delete. */
@Table({
  tableName: 'rush_prospect_activities',
  timestamps: false,
  paranoid: false,
})
export class RushProspectActivity extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @ForeignKey(() => RushProspect)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  prospectId!: string

  @BelongsTo(() => RushProspect, { foreignKey: 'prospectId' })
  prospect?: RushProspect

  @Column({
    type: DataType.ENUM(
      'application_received',
      'stage_change',
      'note',
      'event_attended',
      'call_logged',
      'bid_extended',
      'bid_accepted',
      'bid_declined',
    ),
    allowNull: false,
  })
  activityType!: ActivityType

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  note?: string | null

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  fromStage?: string | null

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  toStage?: string | null

  @ForeignKey(() => RushEvent)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  rushEventId?: string | null

  @BelongsTo(() => RushEvent, { foreignKey: 'rushEventId', as: 'rushEvent' })
  rushEvent?: RushEvent | null

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  createdByUserId?: string | null

  @BelongsTo(() => User, { foreignKey: 'createdByUserId', as: 'createdBy' })
  createdBy?: User | null

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date
}
