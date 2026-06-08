import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  Index,
  HasMany,
} from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'
import { ResourceVersion } from './resource-version.entity'

export enum ResourceTag {
  LEGAL = 'legal',
  INSURANCE = 'insurance',
  NATIONAL = 'national',
  OTHER = 'other',
}

@Table({
  tableName: 'resources',
  timestamps: true,
  paranoid: true,
})
export class Resource extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title!: string

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string | null

  @Index
  @Column({
    type: DataType.ENUM(ResourceTag.LEGAL, ResourceTag.INSURANCE, ResourceTag.NATIONAL, ResourceTag.OTHER),
    allowNull: false,
  })
  tag!: ResourceTag

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  uploadedBy!: string

  @HasMany(() => ResourceVersion, { foreignKey: 'resourceId', as: 'versions' })
  versions?: ResourceVersion[]
}
