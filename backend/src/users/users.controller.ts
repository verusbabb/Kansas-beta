import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Headers,
  ForbiddenException,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateMyEmailDto } from './dto/update-my-email.dto'
import { AssignDirectoryUserRoleDto } from './dto/assign-directory-user-role.dto'
import { UserResponseDto } from './dto/user-response.dto'
import { BulkInviteDto, BulkInviteResultDto } from './dto/bulk-invite.dto'
import { RecordLoginDto } from './dto/record-login.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ActionSecretGuard } from '../auth/guards/action-secret.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole } from '../database/entities/user.entity'
import { User } from '../database/entities/user.entity'

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UsersController.name)
  }

  /**
   * Called by the Auth0 Post-Login Action after every successful login.
   * Secured by a shared secret header — no JWT involved.
   */
  @Post('record-login')
  @UseGuards(ActionSecretGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Record a login event (Auth0 Post-Login Action only)',
    description:
      'Updates lastLoginAt and loginCount for the user. ' +
      'Secured by x-action-secret header, not JWT. Never returns an error status ' +
      'that would block authentication.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Login recorded' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Invalid action secret' })
  async recordLogin(@Body() dto: RecordLoginDto): Promise<void> {
    await this.usersService.recordLogin(dto.auth0Id, dto.email, dto.loginsCount)
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The user has been successfully created.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'User with email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto)
  }

  @Patch('directory-person/:personId')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Assign or update app role for a directory person (admin only)',
    description:
      'Creates an app user from the directory row if needed, or updates role and links `personId`. Uses the directory email and name.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User created or updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Directory person not found' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already linked to another person',
  })
  async assignDirectoryPersonRole(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: AssignDirectoryUserRoleDto,
  ): Promise<UserResponseDto> {
    return this.usersService.assignRoleForDirectoryPerson(personId, dto.role)
  }

  @Get('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check whether an email is authorized (used by Auth0 Pre-Registration Action)',
    description:
      'No JWT required. Authenticated via X-Pre-Reg-Secret header. Returns { authorized: boolean }.',
  })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: '{ authorized: boolean }' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Invalid or missing secret' })
  async checkEmail(
    @Query('email') email: string,
    @Headers('x-pre-reg-secret') secret: string,
  ): Promise<{ authorized: boolean }> {
    const expected = process.env.PRE_REG_SECRET
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Invalid pre-registration secret')
    }
    if (!email) {
      return { authorized: false }
    }
    const authorized = await this.usersService.isEmailAuthorized(email)
    return { authorized }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id)
  }

  @Patch('me/email')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiOperation({
    summary: 'Update your own email address',
    description:
      'Updates email in the database and in Auth0. Auth0 will send a verification email to the new address.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email updated. A verification email has been sent to the new address.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid email or no change' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  async updateMyEmail(
    @CurrentUser() user: User,
    @Body() dto: UpdateMyEmailDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMyEmail(user, dto.email)
  }

  @Post('bulk-invite')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invite a selected list of directory people (admin only)',
    description:
      'Provisions user accounts and sends password-set emails for the provided personIds. ' +
      'People who already have a fully-provisioned account are skipped. ' +
      'Processing is rate-limited to respect Auth0 free-tier limits (~1 s per person). ' +
      'Use dryRun: true to validate without sending any emails.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BulkInviteResultDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
  async bulkInvite(@Body() dto: BulkInviteDto): Promise<BulkInviteResultDto> {
    return this.usersService.bulkInvite(dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all users',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll()
  }

  @Post(':id/resend-invite')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invite / password-reset email to a user (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Returns whether the invite email was sent. Google-only users cannot receive a password reset email.',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'boolean' },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  async resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    return this.usersService.resendInvite(id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user by ID (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The found user',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a user (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user has been successfully updated.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user by ID (admin only, soft delete + Auth0 block)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden - Admin role required' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id)
  }
}
