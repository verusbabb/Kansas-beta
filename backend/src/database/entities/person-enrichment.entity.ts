import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { BaseEntity } from './base.entity'
import { Person } from './person.entity'

export type EnrichmentSource = 'pdl' | 'fullcontact' | 'datagma' | 'none'
export type EnrichmentConfidence = 'high' | 'medium' | 'low'

/**
 * Cached external enrichment for a person.
 * One row per person (upsert on re-enrich). Expires after 90 days by default.
 */
@Table({
  tableName: 'person_enrichments',
  timestamps: true,
  paranoid: false,
  underscored: true,
  indexes: [{ unique: true, fields: ['person_id'] }],
})
export class PersonEnrichment extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: false })
  personId!: string

  @BelongsTo(() => Person)
  person!: Person

  @Column({ type: DataType.STRING(255), allowNull: true })
  employer?: string | null

  @Column({ type: DataType.STRING(255), allowNull: true })
  jobTitle?: string | null

  @Column({ type: DataType.STRING(255), allowNull: true })
  industry?: string | null

  @Column({ type: DataType.TEXT, allowNull: true })
  headline?: string | null

  /** LinkedIn URL discovered via enrichment (may differ from person.linkedinProfileUrl). */
  @Column({ type: DataType.STRING(512), allowNull: true })
  linkedinUrlDiscovered?: string | null

  @Column({
    type: DataType.ENUM('pdl', 'fullcontact', 'datagma', 'none'),
    allowNull: false,
    defaultValue: 'none',
  })
  source!: EnrichmentSource

  @Column({
    type: DataType.ENUM('high', 'medium', 'low'),
    allowNull: true,
  })
  confidence?: EnrichmentConfidence | null

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  enrichedAt!: Date

  /** After this date the cache entry is considered stale and will be re-fetched. */
  @Column({ type: DataType.DATE, allowNull: true })
  expiresAt?: Date | null
}
