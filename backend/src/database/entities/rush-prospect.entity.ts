import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  Index,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { BaseEntity } from './base.entity'
import { Person } from './person.entity'
import { RushProspectActivity } from './rush-prospect-activity.entity'

export type PipelineStage =
  | 'inquiry'
  | 'screened'
  | 'active'
  | 'priority'
  | 'bid_pending'
  | 'bid_extended'
  | 'bid_accepted'
  | 'bid_declined'
  | 'no_bid'
  | 'withdrawn'

export type ClassYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'other'
export type EnrollmentSemester = 'fall' | 'spring'
export type LegacyRelationship = 'father' | 'grandfather' | 'great_grandfather' | 'uncle' | 'brother' | 'cousin'

@Table({
  tableName: 'rush_prospects',
  timestamps: true,
  paranoid: true,
})
export class RushProspect extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  rushYear!: number

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
    type: DataType.STRING(30),
    allowNull: true,
  })
  phone?: string | null

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  hometown?: string | null

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  highSchool?: string | null

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  major?: string | null

  @Column({
    type: DataType.ENUM('freshman', 'sophomore', 'junior', 'senior', 'other'),
    allowNull: true,
  })
  classYear?: ClassYear | null

  @Column({
    type: DataType.ENUM('fall', 'spring'),
    allowNull: true,
  })
  enrollmentSemester?: EnrollmentSemester | null

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  enrollmentYear?: number | null

  @Column({
    type: DataType.DECIMAL(3, 2),
    allowNull: true,
  })
  gpa?: number | null

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  actScore?: number | null

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  satScore?: number | null

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  sportsActivities?: string | null

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  honorsAwards?: string | null

  @ForeignKey(() => Person)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  legacyRelativePersonId?: string | null

  @BelongsTo(() => Person, { foreignKey: 'legacyRelativePersonId', as: 'legacyRelativePerson' })
  legacyRelativePerson?: Person | null

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  legacyRelativeName?: string | null

  @Column({
    type: DataType.ENUM('father', 'grandfather', 'great_grandfather', 'uncle', 'brother', 'cousin'),
    allowNull: true,
  })
  legacyRelationship?: LegacyRelationship | null

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  referralSource?: string | null

  @Index
  @Column({
    type: DataType.ENUM(
      'inquiry',
      'screened',
      'active',
      'priority',
      'bid_pending',
      'bid_extended',
      'bid_accepted',
      'bid_declined',
      'no_bid',
      'withdrawn',
    ),
    allowNull: false,
    defaultValue: 'inquiry',
  })
  pipelineStage!: PipelineStage

  @ForeignKey(() => Person)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  assignedToPersonId?: string | null

  @BelongsTo(() => Person, { foreignKey: 'assignedToPersonId', as: 'assignedToPerson' })
  assignedToPerson?: Person | null

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  internalRating?: number | null

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  applicationSubmittedAt?: Date | null

  @HasMany(() => RushProspectActivity, { foreignKey: 'prospectId' })
  activities?: RushProspectActivity[]
}
