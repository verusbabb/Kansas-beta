import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  Model,
} from 'sequelize-typescript'
import { CreatedAt, UpdatedAt } from 'sequelize-typescript'
import { v4 as uuidv4 } from 'uuid'
import { Person } from './person.entity'
import { ExecTerm } from './exec-term.entity'
import { ExecPosition } from './exec-position.entity'

@Table({
  tableName: 'exec_assignments',
  timestamps: true,
  paranoid: false,
})
export class ExecAssignment extends Model {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string

  @ForeignKey(() => ExecTerm)
  @Column(DataType.UUID)
  execTermId!: string

  @ForeignKey(() => ExecPosition)
  @Column(DataType.UUID)
  execPositionId!: string

  @ForeignKey(() => Person)
  @Column({ type: DataType.UUID, allowNull: true })
  personId?: string | null

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @BelongsTo(() => ExecTerm)
  execTerm!: ExecTerm

  @BelongsTo(() => ExecPosition)
  execPosition!: ExecPosition

  @BelongsTo(() => Person)
  person?: Person | null
}
