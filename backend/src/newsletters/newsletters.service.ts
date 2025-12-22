import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { Newsletter } from '../database/entities/newsletter.entity';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterResponseDto } from './dto/newsletter-response.dto';

@Injectable()
export class NewslettersService {
  constructor(
    @InjectModel(Newsletter)
    private newsletterModel: typeof Newsletter,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NewslettersService.name);
  }

  /**
   * Create a new newsletter
   */
  async create(createNewsletterDto: CreateNewsletterDto): Promise<NewsletterResponseDto> {
    this.logger.debug('Creating newsletter', { season: createNewsletterDto.season, year: createNewsletterDto.year });

    try {
      const newsletter = await this.newsletterModel.create({
        link: createNewsletterDto.link,
        season: createNewsletterDto.season,
        year: createNewsletterDto.year,
      });

      this.logger.info('Newsletter created successfully', { id: newsletter.id });

      return this.toResponseDto(newsletter);
    } catch (error) {
      this.logger.error('Failed to create newsletter', error);
      throw error;
    }
  }

  /**
   * Get all newsletters, sorted by year (descending) and season
   */
  async findAll(): Promise<NewsletterResponseDto[]> {
    this.logger.debug('Fetching all newsletters');

    // Check if model is injected
    if (!this.newsletterModel) {
      const error = new Error('Newsletter model is not injected');
      this.logger.error('Newsletter model injection failed', { 
        model: this.newsletterModel,
        service: 'NewslettersService'
      });
      throw error;
    }

    try {
      this.logger.debug('Attempting to query newsletters table');
      const newsletters = await this.newsletterModel.findAll({
        order: [
          ['year', 'DESC'],
          ['season', 'DESC'], // winter, fall, summer, spring
        ],
      });

      this.logger.debug(`Found ${newsletters.length} newsletters`);

      return newsletters.map((newsletter) => this.toResponseDto(newsletter));
    } catch (error) {
      // Log the full error with all details
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : undefined;
      
      // Log error details (verbose in local, minimal in production)
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // Production: Log essential error info only
        console.error(`Newsletter fetch error: ${errorName} - ${errorMessage}`);
        if ((error as any)?.code) console.error(`Error code: ${(error as any).code}`);
      } else {
        // Local: Log full error details for debugging
        console.error('❌ Newsletter fetch error:');
        console.error(`  Error Name: ${errorName}`);
        console.error(`  Error Message: ${errorMessage}`);
        if ((error as any)?.code) console.error(`  Error Code: ${(error as any).code}`);
        if ((error as any)?.errno) console.error(`  Error Number: ${(error as any).errno}`);
        if ((error as any)?.syscall) console.error(`  System Call: ${(error as any).syscall}`);
        if ((error as any)?.address) console.error(`  Address: ${(error as any).address}`);
        if ((error as any)?.port) console.error(`  Port: ${(error as any).port}`);
        if ((error as any)?.sql) console.error(`  SQL: ${(error as any).sql}`);
        if ((error as any)?.original) {
          const orig = (error as any).original;
          console.error(`  Original Error: ${orig?.message || String(orig)}`);
          if (orig?.code) console.error(`  Original Code: ${orig.code}`);
        }
        if (errorStack) {
          console.error(`  Stack Trace:\n${errorStack.split('\n').slice(0, 10).join('\n')}`);
        }
      }
      
      const errorDetails = {
        message: errorMessage,
        stack: errorStack,
        name: errorName,
        ...(error && typeof error === 'object' && error !== null ? { 
          ...error,
          // Include Sequelize-specific error details
          original: (error as any).original,
          sql: (error as any).sql,
          parameters: (error as any).parameters,
        } : {}),
      };
      this.logger.error('Failed to fetch newsletters', errorDetails);
      // Re-throw to ensure it's caught by the exception filter
      throw error;
    }
  }

  /**
   * Get a newsletter by ID
   */
  async findOne(id: string): Promise<NewsletterResponseDto> {
    this.logger.debug('Fetching newsletter', { id });

    try {
      const newsletter = await this.newsletterModel.findByPk(id);

      if (!newsletter) {
        throw new NotFoundException(`Newsletter with ID ${id} not found`);
      }

      return this.toResponseDto(newsletter);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch newsletter', { id, error });
      throw error;
    }
  }

  /**
   * Delete a newsletter (soft delete)
   */
  async remove(id: string): Promise<void> {
    this.logger.debug('Deleting newsletter', { id });

    try {
      const newsletter = await this.newsletterModel.findByPk(id);

      if (!newsletter) {
        throw new NotFoundException(`Newsletter with ID ${id} not found`);
      }

      await newsletter.destroy();
      this.logger.info('Newsletter deleted successfully', { id });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete newsletter', { id, error });
      throw error;
    }
  }

  /**
   * Convert Newsletter entity to response DTO
   */
  private toResponseDto(newsletter: Newsletter): NewsletterResponseDto {
    return {
      id: newsletter.id,
      link: newsletter.link,
      season: newsletter.season,
      year: newsletter.year,
      createdAt: newsletter.createdAt,
      updatedAt: newsletter.updatedAt,
    };
  }
}

