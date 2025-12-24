import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.debug('Creating user', { email: createUserDto.email, role: createUserDto.role });

    // Check if user with email already exists
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    try {
      const user = await this.userModel.create({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
        auth0Id: null, // Will be set when user signs up in Auth0
      });

      this.logger.info('User created successfully', { id: user.id, email: user.email });

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
    this.logger.debug('Fetching all users');

    try {
      const users = await this.userModel.findAll({
        order: [['email', 'ASC']],
      });

      this.logger.debug(`Found ${users.length} users`);

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
    this.logger.debug('Fetching user', { id });

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
    this.logger.debug('Fetching user by Auth0 ID', { auth0Id });

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
    this.logger.debug('Updating user', { id, updateUserDto });

    try {
      const user = await this.userModel.findByPk(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Check if email is being changed and if new email already exists
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.userModel.findOne({
          where: { email: updateUserDto.email },
        });

        if (existingUser) {
          throw new ConflictException(`User with email ${updateUserDto.email} already exists`);
        }
      }

      // Update user fields
      if (updateUserDto.email) user.email = updateUserDto.email;
      if (updateUserDto.firstName) user.firstName = updateUserDto.firstName;
      if (updateUserDto.lastName) user.lastName = updateUserDto.lastName;
      if (updateUserDto.role) user.role = updateUserDto.role;

      await user.save();

      this.logger.info('User updated successfully', { id: user.id });

      return this.toResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
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
    this.logger.debug('Deleting user', { id });

    try {
      const user = await this.userModel.findByPk(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await user.destroy();
      this.logger.info('User deleted successfully', { id });
    } catch (error) {
      if (error instanceof NotFoundException) {
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
    };
  }
}

