import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Newsletter entity
 * Represents a chapter newsletter with link, season, and year
 */
@Table({
  tableName: 'newsletters',
  timestamps: true,
  paranoid: true, // Enables soft deletes (deletedAt)
})
export class Newsletter extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      isUrl: {
        msg: 'Link must be a valid URL',
      },
    },
  })
  link!: string;

  @Column({
    type: DataType.ENUM('spring', 'summer', 'fall', 'winter'),
    allowNull: false,
  })
  season!: 'spring' | 'summer' | 'fall' | 'winter';

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 2000,
      max: 2100,
    },
  })
  year!: number;
}

