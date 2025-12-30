import { Table, Column, DataType, PrimaryKey, Default, Index } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calendar Event entity
 * Represents a chapter calendar event with name, description, date range, and optional times
 */
@Table({
  tableName: 'calendar_events',
  timestamps: true,
  paranoid: true, // Enables soft deletes (deletedAt)
})
export class CalendarEvent extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Index
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  startDate!: Date;

  @Index
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  endDate!: Date;

  @Column({
    type: DataType.TIME,
    allowNull: true,
  })
  startTime?: Date;

  @Column({
    type: DataType.TIME,
    allowNull: true,
  })
  endTime?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  allDay!: boolean;
}

