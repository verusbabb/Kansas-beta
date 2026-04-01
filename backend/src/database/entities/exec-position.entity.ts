import { Table, Column, DataType, PrimaryKey, Default, Unique, Model } from 'sequelize-typescript'
import { CreatedAt, UpdatedAt } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'

@Table({
  tableName: 'exec_positions',
  timestamps: true,
  paranoid: false,
})
export class ExecPosition extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Unique
  @Column(DataType.STRING(64))
  code!: string

  @Column(DataType.STRING(128))
  displayName!: string

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sortOrder!: number

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
