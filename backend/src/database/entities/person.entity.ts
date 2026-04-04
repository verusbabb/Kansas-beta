import { Table, Column, DataType, PrimaryKey, Default, Index, Unique } from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'

/**
 * Chapter directory person (member and/or parent).
 * Auth users (`users` table) are separate; a person may later link to a user if needed.
 */
@Table({
  tableName: 'people',
  timestamps: true,
  paranoid: true,
})
export class Person extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  addressLine1?: string | null

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  city?: string | null

  @Column({
    type: DataType.STRING(2),
    allowNull: true,
  })
  state?: string | null

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  zip?: string | null

  /**
   * External CRM contact id (e.g. Salesforce); used for bulk import upserts.
   * Nullable for manually created directory rows.
   */
  @Index
  @Column({
    type: DataType.STRING(64),
    allowNull: true,
  })
  externalContactId?: string | null

  @Unique
  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: { msg: 'Email must be a valid email address' },
    },
  })
  email!: string

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  homePhone?: string | null

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  mobilePhone?: string | null

  /** Graduation / pledge class year; only meaningful for members */
  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 1900,
      max: 2100,
    },
  })
  pledgeClassYear?: number | null

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isMember!: boolean

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isParent!: boolean

  /** GCS object path for optional headshot (signed URLs for display). */
  @Column({
    type: DataType.STRING(512),
    allowNull: true,
  })
  headshotFilePath?: string | null
}
