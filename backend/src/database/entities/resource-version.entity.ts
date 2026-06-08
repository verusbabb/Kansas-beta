import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  Index,
  ForeignKey,
  BelongsTo,
  Model,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Resource } from './resource.entity'

@Table({
  tableName: 'resource_versions',
  timestamps: true,
  paranoid: false,
})
export class ResourceVersion extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Index
  @ForeignKey(() => Resource)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  resourceId!: string

  @BelongsTo(() => Resource, { foreignKey: 'resourceId', as: 'resource' })
  resource?: Resource

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  filePath!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  originalFilename!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  contentType!: string

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  fileSize!: number

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  versionNumber!: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  uploadedBy!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}
