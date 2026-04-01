import { Table, Column, DataType, PrimaryKey, Default, Model } from 'sequelize-typescript'
import { CreatedAt, UpdatedAt } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'

export type ExecSeason = 'fall' | 'spring'

@Table({
  tableName: 'exec_terms',
  timestamps: true,
  paranoid: false,
})
export class ExecTerm extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column(DataType.INTEGER)
  year!: number

  @Column(DataType.STRING(16))
  season!: ExecSeason

  @Column({ type: DataType.STRING(128), allowNull: true })
  label?: string | null

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isCurrent!: boolean

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
