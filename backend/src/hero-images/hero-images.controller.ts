import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { HeroImageFile } from './hero-images.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { HeroImagesService } from './hero-images.service';
import { UploadHeroImageDto } from './dto/upload-hero-image.dto';
import { UpdateHeroImageDto } from './dto/update-hero-image.dto';
import { HeroImageResponseDto } from './dto/hero-image-response.dto';
import { BulkUpdateCarouselDto } from './dto/bulk-update-carousel.dto';
import { SignedUrlResponseDto } from '../newsletters/dto/signed-url-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserLookupGuard } from '../auth/guards/user-lookup.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../database/entities/user.entity';
import { User } from '../database/entities/user.entity';

@ApiTags('Hero Images')
@Controller('hero-images')
export class HeroImagesController {
  constructor(
    private readonly heroImagesService: HeroImagesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HeroImagesController.name);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a new hero image (editor/admin only)',
    description: 'Upload an image file and create a hero image record with optional description',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (JPEG, PNG, WebP, or GIF)',
        },
        description: {
          type: 'string',
          description: 'Optional description for the image',
          maxLength: 500,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Hero image uploaded successfully',
    type: HeroImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or file must be an image',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max
          new FileTypeValidator({ 
            fileType: 'image/(jpeg|jpg|png|webp|gif)'
          }),
        ],
      }),
    )
    file: HeroImageFile,
    @Body() uploadDto: UploadHeroImageDto,
    @CurrentUser() user: User,
  ): Promise<HeroImageResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.heroImagesService.createWithFile(
      file,
      uploadDto.description,
      user.email,
    );
  }

  @Get('carousel')
  @ApiOperation({
    summary: 'Get all hero images in the carousel',
    description: 'Retrieve all hero images that are currently displayed in the carousel',
  })
  @ApiResponse({
    status: 200,
    description: 'List of carousel images',
    type: [HeroImageResponseDto],
  })
  async findCarouselImages(): Promise<HeroImageResponseDto[]> {
    return this.heroImagesService.findCarouselImages();
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all hero images (editor/admin only)',
    description: 'Retrieve all hero images, sorted by creation date (newest first)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all hero images',
    type: [HeroImageResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async findAll(): Promise<HeroImageResponseDto[]> {
    return this.heroImagesService.findAll();
  }

  @Patch('carousel')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update carousel images (editor/admin only)',
    description: 'Set which hero images should be displayed in the carousel',
  })
  @ApiResponse({
    status: 200,
    description: 'Carousel updated successfully',
    type: [HeroImageResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async bulkUpdateCarousel(
    @Body() bulkUpdateDto: BulkUpdateCarouselDto,
  ): Promise<HeroImageResponseDto[]> {
    return this.heroImagesService.bulkUpdateCarousel(bulkUpdateDto.imageIds);
  }

  @Get(':id/signed-url')
  @ApiOperation({
    summary: 'Get a signed URL for a hero image',
    description: 'Generate a temporary signed URL for accessing the hero image file',
  })
  @ApiParam({
    name: 'id',
    description: 'Hero Image UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Hero image not found or does not have a file',
  })
  async getSignedUrl(
    @Param('id') id: string,
  ): Promise<SignedUrlResponseDto> {
    const expirationMinutes = 60; // 1 hour default
    const url = await this.heroImagesService.getSignedUrl(id, expirationMinutes);
    return {
      url,
      expiresInMinutes: expirationMinutes,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a hero image by ID',
    description: 'Retrieve a specific hero image by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Hero Image UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Hero image found',
    type: HeroImageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Hero image not found',
  })
  async findOne(@Param('id') id: string): Promise<HeroImageResponseDto> {
    return this.heroImagesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a hero image (editor/admin only)',
    description: 'Update description or carousel status of a hero image',
  })
  @ApiParam({
    name: 'id',
    description: 'Hero Image UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Hero image updated successfully',
    type: HeroImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hero image not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateHeroImageDto,
  ): Promise<HeroImageResponseDto> {
    return this.heroImagesService.update(id, updateDto);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete multiple hero images (editor/admin only)',
    description: 'Delete one or more hero images by their UUIDs',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Array of hero image UUIDs to delete',
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Hero images deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async removeMany(@Body('ids') ids: string[]): Promise<void> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required and must not be empty');
    }
    return this.heroImagesService.removeMany(ids);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a hero image (editor/admin only)',
    description: 'Soft delete a hero image by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Hero Image UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Hero image deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hero image not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.heroImagesService.remove(id);
  }
}

