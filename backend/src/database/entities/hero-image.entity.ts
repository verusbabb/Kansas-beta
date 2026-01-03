import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hero Image entity
 * Represents a hero image for the home page carousel
 */
@Table({
  tableName: 'hero_images',
  timestamps: true,
  paranoid: true, // Enables soft deletes (deletedAt)
})
export class HeroImage extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  filePath!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  uploadedBy!: string;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isInCarousel!: boolean;
}

