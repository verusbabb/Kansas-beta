import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { NewslettersService } from './newsletters.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterResponseDto } from './dto/newsletter-response.dto';

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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new newsletter',
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
  async create(@Body() createNewsletterDto: CreateNewsletterDto): Promise<NewsletterResponseDto> {
    this.logger.debug('Creating newsletter', createNewsletterDto);
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
    this.logger.debug('Fetching all newsletters');
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
    this.logger.debug('Fetching newsletter', { id });
    return this.newslettersService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a newsletter',
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
    status: 404,
    description: 'Newsletter not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.debug('Deleting newsletter', { id });
    return this.newslettersService.remove(id);
  }
}

