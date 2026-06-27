import {
  Table,
  Column,
  DataType,
  PrimaryKey,
  Default,
  Index,
  Unique,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript'
import { BaseEntity } from './base.entity'
import { v4 as uuidv4 } from 'uuid'
import { Person } from './person.entity'

/**
 * User role enum
 */
export enum UserRole {
  VIEWER = 'viewer',
  MEMBER = 'member',
  RUSH_CHAIR = 'rush_chair',
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
  id!: string

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
  email!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  firstName!: string

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  lastName!: string

  @Index
  @Column({
    type: DataType.ENUM(
      UserRole.VIEWER,
      UserRole.MEMBER,
      UserRole.RUSH_CHAIR,
      UserRole.EDITOR,
      UserRole.ADMIN,
    ),
    allowNull: false,
    defaultValue: UserRole.VIEWER,
  })
  role!: UserRole

  @Index
  @Column({
    type: DataType.STRING,
    allowNull: true, // NULL until user signs up in Auth0
    unique: true,
  })
  auth0Id!: string | null

  /** Linked directory person (same email); set on login when unambiguous. */
  @ForeignKey(() => Person)
  @Index
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  personId!: string | null

  @BelongsTo(() => Person)
  person?: Person

  /** Set to now() by the Auth0 Post-Login Action on every successful login. */
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_login_at',
  })
  lastLoginAt!: Date | null

  /** Auth0's authoritative logins_count, synced by the Post-Login Action. */
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'login_count',
  })
  loginCount!: number
}
