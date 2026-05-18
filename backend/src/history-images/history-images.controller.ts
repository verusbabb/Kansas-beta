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
import { HistoryImagesService, HistoryImageFile } from './history-images.service'
import { UploadHistoryImageDto } from './dto/upload-history-image.dto'
import { UpdateHistoryImageDto } from './dto/update-history-image.dto'
import { HistoryImageResponseDto } from './dto/history-image-response.dto'
import { SignedUrlResponseDto } from '../newsletters/dto/signed-url-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole, User } from '../database/entities/user.entity'

@ApiTags('History Images')
@Controller('history-images')
export class HistoryImagesController {
  constructor(
    private readonly historyImagesService: HistoryImagesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HistoryImagesController.name)
  }

  @Get('public')
  @ApiOperation({ summary: 'List history images for public /history page' })
  @ApiResponse({ status: 200, type: [HistoryImageResponseDto] })
  async findPublic(): Promise<HistoryImageResponseDto[]> {
    return this.historyImagesService.findPublic()
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all history images (editor/admin)' })
  @ApiResponse({ status: 200, type: [HistoryImageResponseDto] })
  async findAll(): Promise<HistoryImageResponseDto[]> {
    return this.historyImagesService.findAll()
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a history page image (editor/admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string', maxLength: 500 },
        altText: { type: 'string', maxLength: 255 },
        sortOrder: { type: 'integer', minimum: 0 },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: HistoryImageResponseDto })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|jpg|png|webp|gif)' }),
        ],
      }),
    )
    file: HistoryImageFile,
    @Body() dto: UploadHistoryImageDto,
    @CurrentUser() user: User,
  ): Promise<HistoryImageResponseDto> {
    if (!file) throw new BadRequestException('File is required')
    return this.historyImagesService.createWithFile(file, dto, user.email)
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Get a signed URL for a history image' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: SignedUrlResponseDto })
  async getSignedUrl(@Param('id') id: string): Promise<SignedUrlResponseDto> {
    const url = await this.historyImagesService.getSignedUrl(id, 60)
    return { url, expiresInMinutes: 60 }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update caption, alt text, or sort order (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: HistoryImageResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHistoryImageDto,
  ): Promise<HistoryImageResponseDto> {
    return this.historyImagesService.update(id, dto)
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete multiple history images (editor/admin)' })
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
    return this.historyImagesService.removeMany(ids)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a history image (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string): Promise<void> {
    return this.historyImagesService.remove(id)
  }
}
