import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { RushPhoto } from '../database/entities/rush-photo.entity'
import { StorageService } from '../storage/storage.service'
import { UploadRushPhotoDto } from './dto/upload-rush-photo.dto'
import { UpdateRushPhotoDto } from './dto/update-rush-photo.dto'
import { RushPhotoResponseDto } from './dto/rush-photo-response.dto'

export interface RushPhotoFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class RushPhotosService {
  constructor(
    @InjectModel(RushPhoto)
    private rushPhotoModel: typeof RushPhoto,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushPhotosService.name)
  }

  async createWithFile(
    file: RushPhotoFile,
    dto: UploadRushPhotoDto,
    uploadedBy: string,
  ): Promise<RushPhotoResponseDto> {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)')
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB')
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = now.getTime()
    const fileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `rush-photos/${year}/${month}/${fileName}`

    try {
      const uploadedFilePath = await this.storageService.uploadFile(
        file.buffer,
        filePath,
        file.mimetype,
      )

      // Default sortOrder = max existing + 1
      let sortOrder = dto.sortOrder ?? 0
      if (dto.sortOrder === undefined) {
        const maxRow = await this.rushPhotoModel.findOne({
          order: [['sortOrder', 'DESC']],
        })
        sortOrder = maxRow ? maxRow.sortOrder + 1 : 0
      }

      const photo = await this.rushPhotoModel.create({
        filePath: uploadedFilePath,
        caption: dto.caption?.trim() || null,
        sortOrder,
        uploadedBy,
      })

      return this.toDto(photo)
    } catch (error) {
      this.logger.error('Failed to create rush photo', { uploadedBy, error })
      throw error
    }
  }

  async findPublic(): Promise<RushPhotoResponseDto[]> {
    const rows = await this.rushPhotoModel.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })
    return rows.map((r) => this.toDto(r))
  }

  async findAll(): Promise<RushPhotoResponseDto[]> {
    const rows = await this.rushPhotoModel.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    })
    return rows.map((r) => this.toDto(r))
  }

  async update(id: string, dto: UpdateRushPhotoDto): Promise<RushPhotoResponseDto> {
    const photo = await this.rushPhotoModel.findByPk(id)
    if (!photo) throw new NotFoundException(`Rush photo with ID ${id} not found`)

    if (dto.caption !== undefined) photo.caption = dto.caption?.trim() || undefined
    if (dto.sortOrder !== undefined) photo.sortOrder = dto.sortOrder
    await photo.save()
    return this.toDto(photo)
  }

  async getSignedUrl(id: string, expirationMinutes = 60): Promise<string> {
    const photo = await this.rushPhotoModel.findByPk(id)
    if (!photo) throw new NotFoundException(`Rush photo with ID ${id} not found`)
    return this.storageService.getSignedUrl(photo.filePath, expirationMinutes)
  }

  async remove(id: string): Promise<void> {
    const photo = await this.rushPhotoModel.findByPk(id)
    if (!photo) throw new NotFoundException(`Rush photo with ID ${id} not found`)

    if (photo.filePath) {
      try {
        await this.storageService.deleteFile(photo.filePath)
      } catch (error) {
        this.logger.warn('Failed to delete rush photo file from storage', {
          filePath: photo.filePath,
          error,
        })
      }
    }

    await photo.destroy()
  }

  async removeMany(ids: string[]): Promise<void> {
    const photos = await this.rushPhotoModel.findAll({ where: { id: ids } })
    for (const photo of photos) {
      if (photo.filePath) {
        try {
          await this.storageService.deleteFile(photo.filePath)
        } catch (error) {
          this.logger.warn('Failed to delete rush photo file from storage', {
            filePath: photo.filePath,
            error,
          })
        }
      }
    }
    await this.rushPhotoModel.destroy({ where: { id: ids } })
  }

  private toDto(photo: RushPhoto): RushPhotoResponseDto {
    return {
      id: photo.id,
      filePath: photo.filePath,
      caption: photo.caption || undefined,
      sortOrder: photo.sortOrder,
      uploadedBy: photo.uploadedBy,
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt,
    }
  }
}
