import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { BaseEntity } from './base.entity'

export type KnowledgeSourceType =
  | 'person'
  | 'exec_team'
  | 'calendar_event'
  | 'newsletter'
  | 'rush_event'
  | 'rush_widget'
  | 'house_mom'
  | 'history_image'
  | 'static_page'
  | 'chapter_fact'

/**
 * A single searchable chunk of site content.
 * The `embedding` column is a pgvector vector(768) — it is defined via a raw SQL migration
 * because Sequelize DataTypes does not natively support pgvector.
 * We keep the entity here for ORM-level access to non-vector fields.
 */
@Table({
  tableName: 'knowledge_chunks',
  timestamps: true,
  paranoid: false,
  underscored: true,
})
export class KnowledgeChunk extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Index
  @Column({ type: DataType.STRING(50), allowNull: false })
  sourceType!: KnowledgeSourceType

  /** UUID of the originating DB record, or null for unkeyed content. */
  @Column({ type: DataType.STRING(255), allowNull: true })
  sourceId?: string | null

  /** Natural-language text representation used for embeddings and RAG context. */
  @Column({ type: DataType.TEXT, allowNull: false })
  content!: string

  /** Arbitrary metadata for display/linking (title, author, year, newsletterId, etc.). */
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  metadata!: Record<string, any>

  /** Timestamp of last embedding computation. */
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  indexedAt!: Date
}
