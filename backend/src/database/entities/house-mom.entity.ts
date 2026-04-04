import { Table, Column, DataType, PrimaryKey, Default, Model, CreatedAt, UpdatedAt } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'

/**
 * Singleton-style row for the chapter house mom (public People page + admin edit).
 */
@Table({
  tableName: 'house_mom',
  timestamps: true,
  paranoid: false,
})
export class HouseMom extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '',
  })
  firstName!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '',
  })
  lastName!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: '',
  })
  email!: string

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone?: string | null

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bioHtml?: string | null

  @Column({
    type: DataType.STRING(512),
    allowNull: true,
  })
  photoFilePath?: string | null

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
