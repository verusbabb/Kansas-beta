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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { NewslettersService } from './newsletters.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterResponseDto } from './dto/newsletter-response.dto';
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
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new newsletter (editor/admin only)',
    description: 'Add a new newsletter with link, season, and year',
  })
  @ApiResponse({
    status: 201,
    description: 'Newsletter created successfully',
    type: NewsletterResponseDto,
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
  async create(@Body() createNewsletterDto: CreateNewsletterDto): Promise<NewsletterResponseDto> {
    return this.newslettersService.create(createNewsletterDto);
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

