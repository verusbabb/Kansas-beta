import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { BaseEntity } from './base.entity'
import { Person } from './person.entity'

@Table({
  tableName: 'person_relationships',
  timestamps: true,
  paranoid: true,
})
export class PersonRelationship extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @ForeignKey(() => Person)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  fromPersonId!: string

  @BelongsTo(() => Person, { foreignKey: 'fromPersonId', as: 'fromPerson' })
  fromPerson!: Person

  @ForeignKey(() => Person)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  toPersonId!: string

  @BelongsTo(() => Person, { foreignKey: 'toPersonId', as: 'toPerson' })
  toPerson!: Person

  /** Null = linked, type not specified yet */
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  relationshipType?: string | null

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string | null
}
