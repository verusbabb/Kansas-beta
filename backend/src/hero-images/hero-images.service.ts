import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { HeroImage } from '../database/entities/hero-image.entity';
import { UploadHeroImageDto } from './dto/upload-hero-image.dto';
import { UpdateHeroImageDto } from './dto/update-hero-image.dto';
import { HeroImageResponseDto } from './dto/hero-image-response.dto';
import { BulkUpdateCarouselDto } from './dto/bulk-update-carousel.dto';
import { StorageService } from '../storage/storage.service';

// Type for uploaded file from multer
export interface HeroImageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class HeroImagesService {
  constructor(
    @InjectModel(HeroImage)
    private heroImageModel: typeof HeroImage,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HeroImagesService.name);
  }

  /**
   * Upload a hero image file and create the hero image record
   */
  async createWithFile(
    file: HeroImageFile,
    description: string | undefined,
    uploadedBy: string,
  ): Promise<HeroImageResponseDto> {
    // Validate file is an image
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)');
    }

    // Validate file size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Generate file path: hero-images/{year}/{month}/{timestamp}-{filename}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime();
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `hero-images/${year}/${month}/${fileName}`;

    try {
      // Upload file to Cloud Storage
      const uploadedFilePath = await this.storageService.uploadFile(
        file.buffer,
        filePath,
        file.mimetype,
      );

      // Create hero image record
      const heroImage = await this.heroImageModel.create({
        filePath: uploadedFilePath,
        description: description?.trim() || null,
        uploadedBy,
        isInCarousel: false, // Default to not in carousel
      });

      return this.toResponseDto(heroImage);
    } catch (error) {
      this.logger.error('Failed to create hero image with file', { uploadedBy, error });
      throw error;
    }
  }

  /**
   * Get all hero images, sorted by creation date (newest first)
   */
  async findAll(): Promise<HeroImageResponseDto[]> {
    try {
      const heroImages = await this.heroImageModel.findAll({
        order: [['createdAt', 'DESC']],
      });

      return heroImages.map((heroImage) => this.toResponseDto(heroImage));
    } catch (error) {
      this.logger.error('Failed to fetch hero images', error);
      throw error;
    }
  }

  /**
   * Get all hero images that are in the carousel, sorted by creation date
   */
  async findCarouselImages(): Promise<HeroImageResponseDto[]> {
    try {
      const heroImages = await this.heroImageModel.findAll({
        where: { isInCarousel: true },
        order: [['createdAt', 'DESC']],
      });

      return heroImages.map((heroImage) => this.toResponseDto(heroImage));
    } catch (error) {
      this.logger.error('Failed to fetch carousel images', error);
      throw error;
    }
  }

  /**
   * Get a hero image by ID
   */
  async findOne(id: string): Promise<HeroImageResponseDto> {
    try {
      const heroImage = await this.heroImageModel.findByPk(id);

      if (!heroImage) {
        throw new NotFoundException(`Hero image with ID ${id} not found`);
      }

      return this.toResponseDto(heroImage);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch hero image', { id, error });
      throw error;
    }
  }

  /**
   * Update a hero image
   */
  async update(id: string, updateDto: UpdateHeroImageDto): Promise<HeroImageResponseDto> {
    try {
      const heroImage = await this.heroImageModel.findByPk(id);

      if (!heroImage) {
        throw new NotFoundException(`Hero image with ID ${id} not found`);
      }

      // Update fields if provided
      if (updateDto.description !== undefined) {
        heroImage.description = updateDto.description?.trim() || null;
      }
      if (updateDto.isInCarousel !== undefined) {
        heroImage.isInCarousel = updateDto.isInCarousel;
      }

      await heroImage.save();

      return this.toResponseDto(heroImage);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update hero image', { id, error });
      throw error;
    }
  }

  /**
   * Bulk update which images are in the carousel
   */
  async bulkUpdateCarousel(imageIds: string[]): Promise<HeroImageResponseDto[]> {
    try {
      // First, set all images to not in carousel
      await this.heroImageModel.update(
        { isInCarousel: false },
        { where: {} },
      );

      // Then, set the specified images to in carousel
      if (imageIds.length > 0) {
        await this.heroImageModel.update(
          { isInCarousel: true },
          { where: { id: imageIds } },
        );
      }

      // Return all updated images
      return this.findAll();
    } catch (error) {
      this.logger.error('Failed to bulk update carousel', { imageIds, error });
      throw error;
    }
  }

  /**
   * Delete a hero image (soft delete)
   * Also deletes the associated file from Cloud Storage
   */
  async remove(id: string): Promise<void> {
    try {
      const heroImage = await this.heroImageModel.findByPk(id);

      if (!heroImage) {
        throw new NotFoundException(`Hero image with ID ${id} not found`);
      }

      // Delete the file from Cloud Storage if it exists
      if (heroImage.filePath) {
        try {
          await this.storageService.deleteFile(heroImage.filePath);
        } catch (error) {
          // Log the error but don't fail the deletion - file might already be deleted
          this.logger.warn('Failed to delete file from storage', {
            filePath: heroImage.filePath,
            error,
          });
        }
      }

      await heroImage.destroy();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete hero image', { id, error });
      throw error;
    }
  }

  /**
   * Delete multiple hero images
   */
  async removeMany(ids: string[]): Promise<void> {
    try {
      const heroImages = await this.heroImageModel.findAll({
        where: { id: ids },
      });

      // Delete files from Cloud Storage
      for (const heroImage of heroImages) {
        if (heroImage.filePath) {
          try {
            await this.storageService.deleteFile(heroImage.filePath);
          } catch (error) {
            this.logger.warn('Failed to delete file from storage', {
              filePath: heroImage.filePath,
              error,
            });
          }
        }
      }

      // Soft delete all records
      await this.heroImageModel.destroy({
        where: { id: ids },
      });
    } catch (error) {
      this.logger.error('Failed to delete hero images', { ids, error });
      throw error;
    }
  }

  /**
   * Get a signed URL for a hero image file
   */
  async getSignedUrl(id: string, expirationMinutes = 60): Promise<string> {
    const heroImage = await this.heroImageModel.findByPk(id);

    if (!heroImage) {
      throw new NotFoundException(`Hero image with ID ${id} not found`);
    }

    if (!heroImage.filePath) {
      throw new NotFoundException(`Hero image with ID ${id} does not have a file`);
    }

    try {
      return await this.storageService.getSignedUrl(heroImage.filePath, expirationMinutes);
    } catch (error) {
      this.logger.error('Failed to generate signed URL', { id, filePath: heroImage.filePath, error });
      throw error;
    }
  }

  /**
   * Convert HeroImage entity to response DTO
   */
  private toResponseDto(heroImage: HeroImage): HeroImageResponseDto {
    return {
      id: heroImage.id,
      filePath: heroImage.filePath,
      description: heroImage.description || undefined,
      uploadedBy: heroImage.uploadedBy,
      isInCarousel: heroImage.isInCarousel,
      createdAt: heroImage.createdAt,
      updatedAt: heroImage.updatedAt,
    };
  }
}

