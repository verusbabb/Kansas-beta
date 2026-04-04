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
  @ApiOperation({
    summary: 'List directory people (public)',
    description: 'Returns all people in the chapter directory for display on the public site.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PersonResponseDto] })
  async findAll(): Promise<PersonResponseDto[]> {
    return this.peopleService.findAll()
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk import people from CSV or tab-separated file (editor/admin)',
    description:
      'Required: Contact ID (CRM id), First Name, Last Name, Email, full mailing address, Constituent Code; Preferred Year for Alumni/Undergrad. Upserts by Contact ID (and adopts by email when Contact ID was not set). Optional: Home Phone, Mobile. Skipped rows are returned as skippedFileContent for download.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: BulkImportResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
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
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Directory person profile (viewer / editor / admin)',
    description:
      'Contact and directory fields, legacy/family connections, and executive offices held across all terms.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonProfileResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Site role required' })
  async findProfile(@Param('id', ParseUUIDPipe) id: string): Promise<PersonProfileResponseDto> {
    return this.peopleService.findProfileById(id)
  }

  @Post(':id/headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Upload or replace headshot for a member (editor/admin)',
    description: 'Stored in GCS; used on the executive team roster. Members only.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  async uploadHeadshot(
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
    return this.peopleService.uploadHeadshot(id, file)
  }

  @Delete(':id/headshot')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({ summary: 'Remove headshot image (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  async clearHeadshot(@Param('id', ParseUUIDPipe) id: string): Promise<PersonResponseDto> {
    return this.peopleService.clearHeadshot(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Update a directory person (editor/admin)',
    description: 'Partial update; email must remain unique.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.peopleService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Remove a directory person (editor/admin)',
    description: 'Soft-deletes the person; they no longer appear in the public directory.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Person removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.peopleService.remove(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a chapter directory person (editor/admin)',
    description: 'Adds one member and/or parent record with unique email.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.peopleService.create(dto)
  }
}
