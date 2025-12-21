import { Table, Column, DataType, PrimaryKey, Default } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Guest List entity
 * Represents a guest in the guest list
 */
@Table({
  tableName: 'guest_list',
  timestamps: true,
  paranoid: true, // Enables soft deletes (deletedAt)
})
export class GuestList extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  })
  active!: boolean;
}

