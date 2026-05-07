import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'

@Table({
  tableName: 'rush_photos',
  timestamps: true,
  paranoid: true,
})
export class RushPhoto extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  filePath!: string

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  caption?: string

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sortOrder!: number

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  uploadedBy!: string
}
