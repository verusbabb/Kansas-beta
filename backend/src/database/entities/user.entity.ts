import { Table, Column, DataType, PrimaryKey, Default, Index, Unique } from 'sequelize-typescript';
import { BaseEntity } from './base.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * User role enum
 */
export enum UserRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

/**
 * User entity
 * Represents a system user with authentication and authorization information
 */
@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Enables soft deletes (deletedAt)
})
export class User extends BaseEntity {
  @PrimaryKey
  @Default(() => uuidv4())
  @Column(DataType.UUID)
  id!: string;

  @Unique
  @Index
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Email must be a valid email address',
      },
    },
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName!: string;

  @Index
  @Column({
    type: DataType.ENUM(UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN),
    allowNull: false,
    defaultValue: UserRole.VIEWER,
  })
  role!: UserRole;

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true, // NULL until user signs up in Auth0
    unique: true,
  })
  auth0Id!: string | null;
}

