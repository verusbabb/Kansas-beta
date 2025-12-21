import {
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { Model } from 'sequelize-typescript';

/**
 * Base entity with common fields for all models
 * All models should extend this class
 */
export abstract class BaseEntity extends Model {
  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;
}

