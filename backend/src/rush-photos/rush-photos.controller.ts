import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { RushPhotosService, RushPhotoFile } from './rush-photos.service'
import { UploadRushPhotoDto } from './dto/upload-rush-photo.dto'
import { UpdateRushPhotoDto } from './dto/update-rush-photo.dto'
import { RushPhotoResponseDto } from './dto/rush-photo-response.dto'
import { SignedUrlResponseDto } from '../newsletters/dto/signed-url-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole, User } from '../database/entities/user.entity'

@ApiTags('Rush Photos')
@Controller('rush-photos')
export class RushPhotosController {
  constructor(
    private readonly rushPhotosService: RushPhotosService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushPhotosController.name)
  }

  @Get('public')
  @ApiOperation({ summary: 'List rush photos for public /rush page' })
  @ApiResponse({ status: 200, type: [RushPhotoResponseDto] })
  async findPublic(): Promise<RushPhotoResponseDto[]> {
    return this.rushPhotosService.findPublic()
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all rush photos (editor/admin)' })
  @ApiResponse({ status: 200, type: [RushPhotoResponseDto] })
  async findAll(): Promise<RushPhotoResponseDto[]> {
    return this.rushPhotosService.findAll()
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a rush photo (editor/admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string', maxLength: 500 },
        sortOrder: { type: 'integer', minimum: 0 },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: RushPhotoResponseDto })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|jpg|png|webp|gif)' }),
        ],
      }),
    )
    file: RushPhotoFile,
    @Body() dto: UploadRushPhotoDto,
    @CurrentUser() user: User,
  ): Promise<RushPhotoResponseDto> {
    if (!file) throw new BadRequestException('File is required')
    return this.rushPhotosService.createWithFile(file, dto, user.email)
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a signed URL for a rush photo' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  async getSignedUrl(@Param('id') id: string): Promise<SignedUrlResponseDto> {
    const url = await this.rushPhotosService.getSignedUrl(id, 60)
    return { url, expiresInMinutes: 60 }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update caption or sort order (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: RushPhotoResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRushPhotoDto,
  ): Promise<RushPhotoResponseDto> {
    return this.rushPhotosService.update(id, dto)
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete multiple rush photos (editor/admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'string', format: 'uuid' } } },
      required: ['ids'],
    },
  })
  @ApiResponse({ status: 204 })
  async removeMany(@Body('ids') ids: string[]): Promise<void> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required and must not be empty')
    }
    return this.rushPhotosService.removeMany(ids)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rush photo (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rushPhotosService.remove(id)
  }
}
