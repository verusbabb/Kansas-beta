import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'

@Table({
  tableName: 'rush_events',
  timestamps: true,
  paranoid: true,
})
export class RushEvent extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  title!: string

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  displayDate!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string | null

  @Column({
    type: DataType.STRING(128),
    allowNull: false,
    defaultValue: 'pi pi-calendar',
  })
  icon!: string

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  location?: string | null

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  timeLabel?: string | null

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sortOrder!: number
}
