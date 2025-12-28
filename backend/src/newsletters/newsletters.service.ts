import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { Newsletter } from '../database/entities/newsletter.entity';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { NewsletterResponseDto } from './dto/newsletter-response.dto';
import { StorageService } from '../storage/storage.service';

// Type for uploaded file from multer
export interface NewsletterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class NewslettersService {
  constructor(
    @InjectModel(Newsletter)
    private newsletterModel: typeof Newsletter,
    private readonly storageService: StorageService,
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
        filePath: createNewsletterDto.filePath,
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
   * Also deletes the associated file from Cloud Storage
   */
  async remove(id: string): Promise<void> {
    try {
      const newsletter = await this.newsletterModel.findByPk(id);

      if (!newsletter) {
        throw new NotFoundException(`Newsletter with ID ${id} not found`);
      }

      // Delete the file from Cloud Storage if it exists
      if (newsletter.filePath) {
        try {
          await this.storageService.deleteFile(newsletter.filePath);
        } catch (error) {
          // Log the error but don't fail the deletion - file might already be deleted
          this.logger.warn('Failed to delete file from storage', {
            filePath: newsletter.filePath,
            error,
          });
        }
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
   * Upload a newsletter PDF file and create the newsletter record
   */
  async createWithFile(
    file: NewsletterFile,
    season: 'spring' | 'summer' | 'fall' | 'winter',
    year: number,
  ): Promise<NewsletterResponseDto> {
    // Validate file is a PDF
    if (!file.mimetype || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('File must be a PDF');
    }

    // Generate file path: newsletters/{year}/{season}/{filename}
    const fileName = `${season}-${year}.pdf`;
    const filePath = `newsletters/${year}/${season}/${fileName}`;

    try {
      // Upload file to Cloud Storage
      const uploadedFilePath = await this.storageService.uploadFile(
        file.buffer,
        filePath,
        file.mimetype,
      );

      // Create newsletter record with the file path
      const newsletter = await this.newsletterModel.create({
        filePath: uploadedFilePath,
        season,
        year,
      });

      return this.toResponseDto(newsletter);
    } catch (error) {
      this.logger.error('Failed to create newsletter with file', { season, year, error });
      throw error;
    }
  }

  /**
   * Get a signed URL for a newsletter PDF file
   */
  async getSignedUrl(id: string, expirationMinutes = 60): Promise<string> {
    const newsletter = await this.newsletterModel.findByPk(id);

    if (!newsletter) {
      throw new NotFoundException(`Newsletter with ID ${id} not found`);
    }

    if (!newsletter.filePath) {
      throw new NotFoundException(`Newsletter with ID ${id} does not have a file`);
    }

    try {
      return await this.storageService.getSignedUrl(newsletter.filePath, expirationMinutes);
    } catch (error) {
      this.logger.error('Failed to generate signed URL', { id, filePath: newsletter.filePath, error });
      throw error;
    }
  }

  /**
   * Convert Newsletter entity to response DTO
   */
  private toResponseDto(newsletter: Newsletter): NewsletterResponseDto {
    return {
      id: newsletter.id,
      filePath: newsletter.filePath,
      season: newsletter.season,
      year: newsletter.year,
      createdAt: newsletter.createdAt,
      updatedAt: newsletter.updatedAt,
    };
  }
}

