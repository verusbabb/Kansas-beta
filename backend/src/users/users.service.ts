import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  // List of protected user emails that cannot be edited or deleted
  // Can be configured via environment variable MASTER_USER_EMAILS (comma-separated)
  private readonly protectedUserEmails: string[] = (
    process.env.MASTER_USER_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || []
  );

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  /**
   * Check if a user is protected from editing/deletion
   */
  private isProtectedUser(user: User): boolean {
    return this.protectedUserEmails.includes(user.email.toLowerCase());
  }

  /**
   * Create a new user
   * If a soft-deleted user exists with the same email, it will be restored and updated.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user with email already exists (including soft-deleted users)
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email },
      paranoid: false, // Include soft-deleted records
    });

    if (existingUser) {
      // If user is soft-deleted, restore and update it
      if (existingUser.deletedAt) {
        // Use Sequelize's restore() method to properly restore the soft-deleted record
        await existingUser.restore();
        
        // Update the user fields with new data
        existingUser.firstName = createUserDto.firstName;
        existingUser.lastName = createUserDto.lastName;
        existingUser.role = createUserDto.role;
        // Keep existing auth0Id if set, otherwise leave as null
        // The auth0Id will be set when user signs up in Auth0
        
        await existingUser.save();
        this.logger.info('Restored soft-deleted user', { id: existingUser.id, email: createUserDto.email });
        
        return this.toResponseDto(existingUser);
      } else {
        // Active user already exists
        throw new ConflictException(`User with email ${createUserDto.email} already exists`);
      }
    }

    try {
      // No existing user, create a new one
      const user = await this.userModel.create({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
        auth0Id: null, // Will be set when user signs up in Auth0
      });

      return this.toResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userModel.findAll({
        order: [['email', 'ASC']],
      });

      return users.map((user) => this.toResponseDto(user));
    } catch (error) {
      this.logger.error('Failed to fetch users', error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findByPk(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return this.toResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch user', { id, error });
      throw error;
    }
  }

  /**
   * Get current user by Auth0 ID
   */
  async findByAuth0Id(auth0Id: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userModel.findOne({
        where: { auth0Id },
      });

      if (!user) {
        return null;
      }

      return this.toResponseDto(user);
    } catch (error) {
      this.logger.error('Failed to fetch user by Auth0 ID', { auth0Id, error });
      throw error;
    }
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findByPk(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Prevent editing protected users
      if (this.isProtectedUser(user)) {
        throw new ForbiddenException('This user is protected and cannot be edited');
      }

      // Check if email is being changed and if new email already exists (including soft-deleted users)
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userModel.findOne({
          where: { email: updateUserDto.email },
          paranoid: false, // Include soft-deleted records
        });

        if (existingUser) {
          // Don't allow updating to an email that belongs to any user (active or soft-deleted)
          throw new ConflictException(`User with email ${updateUserDto.email} already exists`);
        }
      }

      // Update user fields
      if (updateUserDto.email) user.email = updateUserDto.email;
      if (updateUserDto.firstName) user.firstName = updateUserDto.firstName;
      if (updateUserDto.lastName) user.lastName = updateUserDto.lastName;
      if (updateUserDto.role) user.role = updateUserDto.role;

      await user.save();

      return this.toResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Failed to update user', { id, error });
      throw error;
    }
  }

  /**
   * Delete a user (soft delete)
   */
  async remove(id: string): Promise<void> {

    try {
      const user = await this.userModel.findByPk(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Prevent deleting protected users
      if (this.isProtectedUser(user)) {
        throw new ForbiddenException('This user is protected and cannot be deleted');
      }

      await user.destroy();
      this.logger.info('User deleted successfully', { id });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Failed to delete user', { id, error });
      throw error;
    }
  }

  /**
   * Convert User entity to response DTO
   */
  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      auth0Id: user.auth0Id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isProtected: this.isProtectedUser(user),
    };
  }
}

