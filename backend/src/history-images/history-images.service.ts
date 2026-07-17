import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { HistoryImage } from '../database/entities/history-image.entity'
import { StorageService } from '../storage/storage.service'
import { UploadHistoryImageDto } from './dto/upload-history-image.dto'
import { UpdateHistoryImageDto } from './dto/update-history-image.dto'
import { HistoryImageResponseDto } from './dto/history-image-response.dto'
import { IndexingService } from '../knowledge/indexing.service'

export interface HistoryImageFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class HistoryImagesService {
  constructor(
    @InjectModel(HistoryImage)
    private historyImageModel: typeof HistoryImage,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
    private readonly indexingService: IndexingService,
  ) {
    this.logger.setContext(HistoryImagesService.name)
  }

  async createWithFile(
    file: HistoryImageFile,
    dto: UploadHistoryImageDto,
    uploadedBy: string,
  ): Promise<HistoryImageResponseDto> {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)')
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB')
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = now.getTime()
    const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `history-images/${year}/${month}/${fileName}`

    try {
      const uploadedFilePath = await this.storageService.uploadFile(
        file.buffer,
        filePath,
        file.mimetype,
      )

      let sortOrder = dto.sortOrder ?? 0
      if (dto.sortOrder === undefined) {
        const maxRow = await this.historyImageModel.findOne({
          order: [['sortOrder', 'DESC']],
        })
        sortOrder = maxRow ? maxRow.sortOrder + 1 : 0
      }

      const image = await this.historyImageModel.create({
        filePath: uploadedFilePath,
        caption: dto.caption?.trim() || null,
        altText: dto.altText?.trim() || null,
        sortOrder,
        uploadedBy,
      })

      void this.indexingService.reindexSource('history_image')
      return this.toDto(image)
    } catch (error) {
      this.logger.error('Failed to create history image', { uploadedBy, error })
      throw error
    }
  }

  async findPublic(): Promise<HistoryImageResponseDto[]> {
    const rows = await this.historyImageModel.findAll({
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    return rows.map((r) => this.toDto(r))
  }

  async findAll(): Promise<HistoryImageResponseDto[]> {
    const rows = await this.historyImageModel.findAll({
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })
    return rows.map((r) => this.toDto(r))
  }

  async update(id: string, dto: UpdateHistoryImageDto): Promise<HistoryImageResponseDto> {
    const image = await this.historyImageModel.findByPk(id)
    if (!image) throw new NotFoundException(`History image with ID ${id} not found`)
    if (dto.caption !== undefined) image.caption = dto.caption?.trim() || undefined
    if (dto.altText !== undefined) image.altText = dto.altText?.trim() || undefined
    if (dto.sortOrder !== undefined) image.sortOrder = dto.sortOrder
    await image.save()
    void this.indexingService.reindexSource('history_image')
    return this.toDto(image)
  }

  async getSignedUrl(id: string, expirationMinutes = 60): Promise<string> {
    const image = await this.historyImageModel.findByPk(id)
    if (!image) throw new NotFoundException(`History image with ID ${id} not found`)
    return this.storageService.getSignedUrl(image.filePath, expirationMinutes)
  }

  async remove(id: string): Promise<void> {
    const image = await this.historyImageModel.findByPk(id)
    if (!image) throw new NotFoundException(`History image with ID ${id} not found`)
    if (image.filePath) {
      try {
        await this.storageService.deleteFile(image.filePath)
      } catch (error) {
        this.logger.warn('Failed to delete history image file from storage', {
          filePath: image.filePath,
          error,
        })
      }
    }
    await image.destroy()
    void this.indexingService.reindexSource('history_image')
  }

  async removeMany(ids: string[]): Promise<void> {
    const images = await this.historyImageModel.findAll({ where: { id: ids } })
    for (const image of images) {
      if (image.filePath) {
        try {
          await this.storageService.deleteFile(image.filePath)
        } catch (error) {
          this.logger.warn('Failed to delete history image file from storage', {
            filePath: image.filePath,
            error,
          })
        }
      }
    }
    await this.historyImageModel.destroy({ where: { id: ids } })
    void this.indexingService.reindexSource('history_image')
  }

  private toDto(image: HistoryImage): HistoryImageResponseDto {
    return {
      id: image.id,
      filePath: image.filePath,
      caption: image.caption || undefined,
      altText: image.altText || undefined,
      sortOrder: image.sortOrder,
      uploadedBy: image.uploadedBy,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }
  }
}
