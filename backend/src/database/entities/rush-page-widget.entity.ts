import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'

/** Four fixed “Why Rush?” cards on /rush (slotIndex 0–3). */
@Table({
  tableName: 'rush_page_widgets',
  timestamps: true,
  paranoid: true,
})
export class RushPageWidget extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Index({ unique: true })
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  slotIndex!: number

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  title!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bodyHtml?: string | null
}
