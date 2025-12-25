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
    try {
      const newsletter = await this.newsletterModel.create({
        link: createNewsletterDto.link,
        season: createNewsletterDto.season,
        year: createNewsletterDto.year,
      });

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
    try {
      const newsletters = await this.newsletterModel.findAll({
        order: [
          ['year', 'DESC'],
          ['season', 'DESC'], // winter, fall, summer, spring
        ],
      });

      return newsletters.map((newsletter) => this.toResponseDto(newsletter));
    } catch (error) {
      this.logger.error('Failed to fetch newsletters', error);
      throw error;
    }
  }

  /**
   * Get a newsletter by ID
   */
  async findOne(id: string): Promise<NewsletterResponseDto> {
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
    try {
      const newsletter = await this.newsletterModel.findByPk(id);

      if (!newsletter) {
        throw new NotFoundException(`Newsletter with ID ${id} not found`);
      }

      await newsletter.destroy();
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

