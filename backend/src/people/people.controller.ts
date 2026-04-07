import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { PeopleService } from './people.service'
import { CreatePersonDto } from './dto/create-person.dto'
import { UpdatePersonDto } from './dto/update-person.dto'
import { PersonResponseDto } from './dto/person-response.dto'
import { PersonProfileResponseDto } from './dto/person-profile-response.dto'
import { BulkImportResponseDto } from './dto/bulk-import-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { OptionalUserLookupGuard } from '../auth/guards/optional-user-lookup.guard'
import { User } from '../database/entities/user.entity'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'
import type { PersonHeadshotFile } from './people.service'

@ApiTags('People')
@Controller('people')
export class PeopleController {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PeopleController.name)
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard, OptionalUserLookupGuard)
  @ApiOperation({
    summary: 'List directory people (public)',
    description:
      'Guests receive redacted contact fields (email, phones, address, LinkedIn, CRM id) with `has*` flags where values exist. Signed-in members see fields each person has chosen to share. Only site administrators receive full rows (admin directory).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PersonResponseDto] })
  async findAll(@Req() req: { user?: User }): Promise<PersonResponseDto[]> {
    return this.peopleService.findAll(req.user)
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk import people from CSV or tab-separated file (admin only)',
    description:
      'Required: Contact ID (CRM id), First Name, Last Name, Email, full mailing address, Constituent Code; Preferred Year for Alumni/Undergrad. Upserts by Contact ID (and adopts by email when Contact ID was not set). Optional: Home Phone, Mobile. Skipped rows are returned as skippedFileContent for download.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BulkImportResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin required' })
  async bulkImport(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: PersonHeadshotFile,
  ): Promise<BulkImportResponseDto> {
    return this.peopleService.bulkImportFromFile(file.buffer)
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard, OptionalUserLookupGuard)
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Directory person profile (public)',
    description:
      'Same privacy rules as GET /people for guests and members; site administrators see full directory fields for any profile. You always see your own full row when viewing yourself. Includes connections, exec history, and signed URLs for profile and exec roster photos when present.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonProfileResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  async findProfile(
    @Req() req: { user?: User },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PersonProfileResponseDto> {
    return this.peopleService.findProfileById(id, req.user)
  }

  @Post(':id/profile-headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Upload or replace directory/profile headshot (editor/admin or linked self)',
    description:
      'Current photo for the person profile and directory. Members and parents. Stored under `people-profile-headshots/` in GCS.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your linked profile and not admin' })
  async uploadProfileHeadshot(
    @Req() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|jpg|png|webp|gif)' }),
        ],
      }),
    )
    file: PersonHeadshotFile,
  ): Promise<PersonResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required')
    }
    return this.peopleService.uploadProfileHeadshot(id, file, req.user)
  }

  @Delete(':id/profile-headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({ summary: 'Remove directory/profile headshot (admin or linked self)' })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your linked profile and not admin' })
  async clearProfileHeadshot(
    @Req() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PersonResponseDto> {
    return this.peopleService.clearProfileHeadshot(id, req.user)
  }

  @Post(':id/exec-roster-headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Upload or replace executive roster headshot (editor/admin or linked member self)',
    description:
      'Era photo for the exec team roster. Chapter members only. Stored under `people-exec-headshots/` in GCS.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your linked profile and not admin' })
  async uploadExecRosterHeadshot(
    @Req() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|jpg|png|webp|gif)' }),
        ],
      }),
    )
    file: PersonHeadshotFile,
  ): Promise<PersonResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required')
    }
    return this.peopleService.uploadExecRosterHeadshot(id, file, req.user)
  }

  @Delete(':id/exec-roster-headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({ summary: 'Remove executive roster headshot (admin or linked member self)' })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your linked profile and not admin' })
  async clearExecRosterHeadshot(
    @Req() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PersonResponseDto> {
    return this.peopleService.clearExecRosterHeadshot(id, req.user)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Update a directory person (self or admin)',
    description:
      'Site administrators may update any directory row (admin panel). Signed-in members may update only their own linked profile (contact fields and share toggles); `kind` and `externalContactId` are ignored for self-service.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must be the directory person or a site administrator',
  })
  async update(
    @Req() req: { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.peopleService.update(id, dto, req.user)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Remove a directory person (admin only)',
    description: 'Soft-deletes the person; they no longer appear in the public directory.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Person removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.peopleService.remove(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a chapter directory person (admin only)',
    description: 'Adds one member and/or parent record with unique email.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin required' })
  async create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.peopleService.create(dto)
  }
}
