import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import type { NewsletterFile } from './newsletters.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { NewslettersService } from './newsletters.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UploadNewsletterDto } from './dto/upload-newsletter.dto';
import { NewsletterResponseDto } from './dto/newsletter-response.dto';
import { SignedUrlResponseDto } from './dto/signed-url-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserLookupGuard } from '../auth/guards/user-lookup.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Newsletters')
@Controller('newsletters')
export class NewslettersController {
  constructor(
    private readonly newslettersService: NewslettersService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NewslettersController.name);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new newsletter with PDF upload (editor/admin only)',
    description: 'Upload a PDF file and create a newsletter record with season and year',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to upload',
        },
        season: {
          type: 'string',
          enum: ['spring', 'summer', 'fall', 'winter'],
          description: 'Season of the newsletter',
        },
        year: {
          type: 'integer',
          description: 'Year of the newsletter',
          minimum: 2000,
          maximum: 2100,
        },
      },
      required: ['file', 'season', 'year'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Newsletter created successfully',
    type: NewsletterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or file must be a PDF',
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
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB max
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: NewsletterFile,
    @Body() uploadDto: UploadNewsletterDto,
  ): Promise<NewsletterResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.newslettersService.createWithFile(file, uploadDto.season, uploadDto.year);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all newsletters',
    description: 'Retrieve all newsletters, sorted by year (newest first) and season',
  })
  @ApiResponse({
    status: 200,
    description: 'List of newsletters',
    type: [NewsletterResponseDto],
  })
  async findAll(): Promise<NewsletterResponseDto[]> {
    return this.newslettersService.findAll();
  }

  @Get(':id/signed-url')
  @ApiOperation({
    summary: 'Get a signed URL for a newsletter PDF',
    description: 'Generate a temporary signed URL for accessing the newsletter PDF file',
  })
  @ApiParam({
    name: 'id',
    description: 'Newsletter UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Newsletter not found or does not have a file',
  })
  async getSignedUrl(
    @Param('id') id: string,
  ): Promise<SignedUrlResponseDto> {
    const expirationMinutes = 60; // 1 hour default
    const url = await this.newslettersService.getSignedUrl(id, expirationMinutes);
    return {
      url,
      expiresInMinutes: expirationMinutes,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a newsletter by ID',
    description: 'Retrieve a specific newsletter by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Newsletter UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Newsletter found',
    type: NewsletterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Newsletter not found',
  })
  async findOne(@Param('id') id: string): Promise<NewsletterResponseDto> {
    return this.newslettersService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a newsletter (editor/admin only)',
    description: 'Soft delete a newsletter by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Newsletter UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Newsletter deleted successfully',
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
    description: 'Newsletter not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.newslettersService.remove(id);
  }
}

