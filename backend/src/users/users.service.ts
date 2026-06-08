import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Op } from 'sequelize'
import { User, UserRole } from '../database/entities/user.entity'
import { Person } from '../database/entities/person.entity'
import { Auth0ManagementService } from '../auth0/auth0-management.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserResponseDto } from './dto/user-response.dto'
import { BulkInviteDto, BulkInviteResultDto } from './dto/bulk-invite.dto'

@Injectable()
export class UsersService {
  // List of protected user emails that cannot be edited or deleted
  // Can be configured via environment variable MASTER_USER_EMAILS (comma-separated)
  private readonly protectedUserEmails: string[] =
    process.env.MASTER_USER_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || []

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Person)
    private personModel: typeof Person,
    private readonly auth0: Auth0ManagementService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersService.name)
  }

  /**
   * Check if a user is protected from editing/deletion
   */
  private isProtectedUser(user: User): boolean {
    return this.protectedUserEmails.includes(user.email.toLowerCase())
  }

  /**
   * Create a new user.
   * If a soft-deleted user exists with the same email, it is restored and updated.
   * Provisions the user in Auth0 and sends a password-set invite.
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user with email already exists (including soft-deleted users)
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email },
      paranoid: false,
    })

    if (existingUser) {
      if (existingUser.deletedAt) {
        await existingUser.restore()
        existingUser.firstName = createUserDto.firstName
        existingUser.lastName = createUserDto.lastName
        existingUser.role = createUserDto.role
        await existingUser.save()
        this.logger.info('Restored soft-deleted user', {
          id: existingUser.id,
          email: createUserDto.email,
        })
        await this.syncAuth0OnRestore(existingUser)
        return this.toResponseDto(existingUser)
      } else {
        throw new ConflictException(`User with email ${createUserDto.email} already exists`)
      }
    }

    try {
      const user = await this.userModel.create({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
        auth0Id: null,
      })

      const auth0Id = await this.auth0.provisionUser(user.email, user.firstName, user.lastName)
      if (auth0Id) {
        user.auth0Id = auth0Id
        await user.save()
      }

      return this.toResponseDto(user)
    } catch (error) {
      this.logger.error('Failed to create user', error)
      throw error
    }
  }

  /**
   * Create or update the app user tied to a directory person: sync name/email from `people`,
   * set role and `personId`. Provisions the user in Auth0 if not already linked.
   */
  async assignRoleForDirectoryPerson(personId: string, role: UserRole): Promise<UserResponseDto> {
    const person = await this.personModel.findByPk(personId)
    if (!person) {
      throw new NotFoundException('Directory person not found')
    }
    const rawEmail = person.personalEmail?.trim().toLowerCase()
    if (!rawEmail) {
      throw new BadRequestException('Directory person has no email; cannot assign an app role')
    }

    const firstName = person.firstName?.trim() || 'User'
    const lastName = person.lastName?.trim() || ''

    const byPerson = await this.userModel.findOne({
      where: { personId },
      paranoid: false,
    })
    if (byPerson) {
      const wasDeleted = !!byPerson.deletedAt
      if (wasDeleted) {
        await byPerson.restore()
      }
      if (this.isProtectedUser(byPerson)) {
        throw new ForbiddenException('This user is protected and cannot be edited')
      }
      byPerson.role = role
      byPerson.email = rawEmail
      byPerson.firstName = firstName
      byPerson.lastName = lastName
      byPerson.personId = personId
      await byPerson.save()
      this.logger.info('Updated app user role for directory person', {
        personId,
        userId: byPerson.id,
      })
      if (wasDeleted) {
        await this.syncAuth0OnRestore(byPerson)
      } else {
        await this.syncAuth0OnProvision(byPerson)
      }
      return this.toResponseDto(byPerson)
    }

    const byEmail = await this.userModel.findOne({
      where: { email: { [Op.iLike]: rawEmail } },
      paranoid: false,
    })
    if (byEmail) {
      const wasDeleted = !!byEmail.deletedAt
      if (wasDeleted) {
        await byEmail.restore()
      }
      if (this.isProtectedUser(byEmail)) {
        throw new ForbiddenException('This user is protected and cannot be edited')
      }
      if (byEmail.personId != null && byEmail.personId !== personId) {
        throw new ConflictException(
          'An app account with this email is already linked to a different directory person',
        )
      }
      byEmail.personId = personId
      byEmail.role = role
      byEmail.email = rawEmail
      byEmail.firstName = firstName
      byEmail.lastName = lastName
      await byEmail.save()
      this.logger.info('Linked directory person to existing app user and set role', {
        personId,
        userId: byEmail.id,
      })
      if (wasDeleted) {
        await this.syncAuth0OnRestore(byEmail)
      } else {
        await this.syncAuth0OnProvision(byEmail)
      }
      return this.toResponseDto(byEmail)
    }

    const user = await this.userModel.create({
      email: rawEmail,
      firstName,
      lastName,
      role,
      personId,
      auth0Id: null,
    })
    this.logger.info('Created app user from directory person', { personId, userId: user.id })

    const auth0Id = await this.auth0.provisionUser(rawEmail, firstName, lastName)
    if (auth0Id) {
      user.auth0Id = auth0Id
      await user.save()
    }

    return this.toResponseDto(user)
  }

  /**
   * Get all users
   */
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userModel.findAll({
        order: [['email', 'ASC']],
      })

      return users.map((user) => this.toResponseDto(user))
    } catch (error) {
      this.logger.error('Failed to fetch users', error)
      throw error
    }
  }

  /**
   * Get a user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findByPk(id)

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`)
      }

      return this.toResponseDto(user)
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Failed to fetch user', { id, error })
      throw error
    }
  }

  /**
   * Get current user by Auth0 ID
   */
  async findByAuth0Id(auth0Id: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userModel.findOne({
        where: { auth0Id },
      })

      if (!user) {
        return null
      }

      return this.toResponseDto(user)
    } catch (error) {
      this.logger.error('Failed to fetch user by Auth0 ID', { auth0Id, error })
      throw error
    }
  }

  /**
   * Update a user (admin)
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findByPk(id)

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`)
      }

      if (this.isProtectedUser(user)) {
        throw new ForbiddenException('This user is protected and cannot be edited')
      }

      const emailChanging = updateUserDto.email && updateUserDto.email !== user.email

      if (emailChanging) {
        const existingUser = await this.userModel.findOne({
          where: { email: updateUserDto.email },
          paranoid: false,
        })

        if (existingUser) {
          throw new ConflictException(`User with email ${updateUserDto.email} already exists`)
        }
      }

      const oldEmail = user.email
      if (updateUserDto.email) user.email = updateUserDto.email
      if (updateUserDto.firstName) user.firstName = updateUserDto.firstName
      if (updateUserDto.lastName) user.lastName = updateUserDto.lastName
      if (updateUserDto.role !== undefined) user.role = updateUserDto.role

      await user.save()

      // Sync email change to Auth0 (admin-driven = trusted, mark verified)
      if (emailChanging && user.auth0Id && updateUserDto.email) {
        await this.auth0.updateEmail(user.auth0Id, updateUserDto.email, true)
        this.logger.info('Synced email change to Auth0', {
          userId: user.id,
          oldEmail,
          newEmail: updateUserDto.email,
        })
      }

      return this.toResponseDto(user)
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error
      }
      this.logger.error('Failed to update user', { id, error })
      throw error
    }
  }

  /**
   * Self-service email update for the currently authenticated user.
   * Requires re-verification via Auth0 email.
   */
  async updateMyEmail(currentUser: User, newEmail: string): Promise<UserResponseDto> {
    const normalizedEmail = newEmail.trim().toLowerCase()

    if (normalizedEmail === currentUser.email) {
      throw new BadRequestException('New email is the same as the current email')
    }

    const conflict = await this.userModel.findOne({
      where: { email: normalizedEmail },
      paranoid: false,
    })
    if (conflict) {
      throw new ConflictException(`Email ${newEmail} is already in use`)
    }

    currentUser.email = normalizedEmail
    await currentUser.save()

    // Keep the linked directory person in sync
    if (currentUser.personId) {
      const person = await this.personModel.findByPk(currentUser.personId)
      if (person && person.personalEmail !== normalizedEmail) {
        person.personalEmail = normalizedEmail
        await person.save()
      }
    }

    // Self-service = not trusted, require Auth0 email verification
    if (currentUser.auth0Id) {
      await this.auth0.updateEmail(currentUser.auth0Id, normalizedEmail, false)
    }

    this.logger.info('User updated their own email', {
      userId: currentUser.id,
      newEmail: normalizedEmail,
    })

    return this.toResponseDto(currentUser)
  }

  /**
   * Resend the Auth0 password-reset / invite email to an existing user.
   * Returns whether the email was sent and an optional reason if it was not.
   */
  async resendInvite(id: string): Promise<{ sent: boolean; reason?: string }> {
    const user = await this.userModel.findByPk(id)
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    const result = await this.auth0.resendPasswordResetEmail(user.email)
    if (result.sent) {
      this.logger.info('Resent invite email', { userId: id, email: user.email })
    } else {
      this.logger.info('Skipped invite email (social-only user)', {
        userId: id,
        email: user.email,
        reason: result.reason,
      })
    }
    return result
  }

  /**
   * Check whether an email is authorized (used by the Auth0 Pre-Registration Action).
   * Only active (non-deleted) users count.
   */
  async isEmailAuthorized(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      where: { email: email.trim().toLowerCase() },
    })
    return user !== null
  }

  /**
   * Delete a user (soft delete) and block them in Auth0.
   */
  async remove(id: string): Promise<void> {
    try {
      const user = await this.userModel.findByPk(id)

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`)
      }

      if (this.isProtectedUser(user)) {
        throw new ForbiddenException('This user is protected and cannot be deleted')
      }

      const auth0Id = user.auth0Id
      await user.destroy()
      this.logger.info('User soft-deleted', { id })

      if (auth0Id) {
        await this.auth0.blockUser(auth0Id)
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error
      }
      this.logger.error('Failed to delete user', { id, error })
      throw error
    }
  }

  /**
   * Invite a specific list of directory people selected by the admin.
   *
   * People who already have a fully-provisioned account (auth0Id set) are
   * skipped so their existing role is never overwritten and no duplicate
   * emails are sent. Everyone else is created as a Viewer and sent a
   * password-set invite.
   *
   * Auth0 free tier: 2 Management API req/sec (burst 10). Each provisionUser()
   * makes 2 calls, so we sleep 1000ms between people to stay within limits.
   */
  async bulkInvite(dto: BulkInviteDto): Promise<BulkInviteResultDto> {
    const { personIds, dryRun } = dto
    const total = personIds.length

    if (dryRun) {
      return { total, skipped: 0, invited: 0, failed: 0 }
    }

    // Build provisioned sets to avoid overwriting existing accounts
    const provisionedUsers = await this.userModel.findAll({
      where: { auth0Id: { [Op.ne]: null } },
      paranoid: false,
      attributes: ['email', 'personId'],
    })
    const provisionedPersonIds = new Set<string>(
      provisionedUsers.map((u) => u.personId).filter((id): id is string => id !== null),
    )
    const provisionedEmails = new Set<string>(provisionedUsers.map((u) => u.email.toLowerCase()))

    // Load only the requested people
    const people = await this.personModel.findAll({
      where: { id: { [Op.in]: personIds } },
      attributes: ['id', 'personalEmail', 'firstName', 'lastName'],
    })

    let skipped = 0
    let invited = 0
    let failed = 0

    for (let i = 0; i < people.length; i++) {
      const person = people[i]

      // Skip already-provisioned people
      if (
        provisionedPersonIds.has(person.id) ||
        (person.personalEmail && provisionedEmails.has(person.personalEmail.toLowerCase()))
      ) {
        skipped++
        continue
      }

      try {
        const result = await this.assignRoleForDirectoryPerson(person.id, UserRole.VIEWER)
        if (result.auth0Id) {
          invited++
        } else {
          failed++
        }
      } catch (error) {
        this.logger.warn('bulkInvite: failed for person', {
          personId: person.id,
          email: person.personalEmail,
          error: error instanceof Error ? error.message : String(error),
        })
        failed++
      }

      // Sleep between people to stay within Auth0's 2 req/sec Management API limit
      if (i < people.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    this.logger.info('bulkInvite complete', { total, skipped, invited, failed })

    return { total, skipped, invited, failed }
  }

  /**
   * If the user has no auth0Id yet, provision them now (e.g. users created before this feature).
   */
  private async syncAuth0OnProvision(user: User): Promise<void> {
    if (user.auth0Id) return
    const auth0Id = await this.auth0.provisionUser(user.email, user.firstName, user.lastName)
    if (auth0Id) {
      user.auth0Id = auth0Id
      await user.save()
    }
  }

  /**
   * On restore: unblock if already linked, otherwise provision fresh.
   */
  private async syncAuth0OnRestore(user: User): Promise<void> {
    if (user.auth0Id) {
      await this.auth0.unblockUser(user.auth0Id)
    } else {
      const auth0Id = await this.auth0.provisionUser(user.email, user.firstName, user.lastName)
      if (auth0Id) {
        user.auth0Id = auth0Id
        await user.save()
      }
    }
  }

  /**
   * Record a successful login from the Auth0 Post-Login Action.
   *
   * Looks up the user by auth0Id first, then falls back to email (handles the
   * first-ever Google login where linking has just happened mid-pipeline and
   * the JWT sub hasn't switched to the primary auth0| ID yet).
   *
   * Self-heals the stored auth0Id if the fallback email match finds a mismatch.
   * Never throws — login must not be blocked by a recording failure.
   */
  async recordLogin(auth0Id: string, email: string, loginsCount: number): Promise<void> {
    try {
      let user = await this.userModel.findOne({ where: { auth0Id } })

      if (!user) {
        user = await this.userModel.findOne({ where: { email } })
        if (!user) {
          this.logger.warn('recordLogin: no user found', { auth0Id, email })
          return
        }
        if (user.auth0Id !== auth0Id) {
          this.logger.info('recordLogin: updating auth0Id via email fallback', {
            email,
            oldAuth0Id: user.auth0Id,
            newAuth0Id: auth0Id,
          })
          user.auth0Id = auth0Id
        }
      }

      user.lastLoginAt = new Date()
      user.loginCount = loginsCount
      await user.save()

      this.logger.info('recordLogin: updated login stats', { userId: user.id, loginsCount })
    } catch (error) {
      this.logger.error('recordLogin: failed to update login stats', {
        auth0Id,
        email,
        error: error instanceof Error ? error.message : String(error),
      })
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
      personId: user.personId ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isProtected: this.isProtectedUser(user),
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
    }
  }
}
