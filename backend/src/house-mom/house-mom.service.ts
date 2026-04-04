import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { HouseMom } from '../database/entities/house-mom.entity'
import { StorageService } from '../storage/storage.service'
import { HouseMomPublicDto } from './dto/house-mom-public.dto'
import { UpdateHouseMomDto } from './dto/update-house-mom.dto'
import { normalizeUsPhoneForStorage } from '../common/utils/us-phone'

const PHOTO_URL_EXPIRY_MINUTES = 7 * 24 * 60

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface HouseMomPhotoFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class HouseMomService {
  constructor(
    @InjectModel(HouseMom)
    private readonly houseMomModel: typeof HouseMom,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HouseMomService.name)
  }

  private async signedPhotoUrl(path: string | null | undefined): Promise<string | null> {
    if (!path) return null
    try {
      return await this.storageService.getSignedUrl(path, PHOTO_URL_EXPIRY_MINUTES)
    } catch (e) {
      this.logger.warn('House mom photo signed URL failed', { error: e })
      return null
    }
  }

  private toPublicDto(row: HouseMom, photoUrl: string | null): HouseMomPublicDto {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone ?? null,
      bioHtml: row.bioHtml ?? null,
      photoUrl,
    }
  }

  /**
   * Public + admin read. Returns placeholder-friendly empty strings when no row exists yet.
   */
  async getPublic(): Promise<HouseMomPublicDto> {
    const row = await this.houseMomModel.findOne({ order: [['createdAt', 'ASC']] })
    if (!row) {
      return {
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: null,
        bioHtml: null,
        photoUrl: null,
      }
    }
    const photoUrl = await this.signedPhotoUrl(row.photoFilePath)
    return this.toPublicDto(row, photoUrl)
  }

  private async getOrCreateRow(): Promise<HouseMom> {
    const existing = await this.houseMomModel.findOne({ order: [['createdAt', 'ASC']] })
    if (existing) return existing
    return this.houseMomModel.create({
      firstName: '',
      lastName: '',
      email: '',
      phone: null,
      bioHtml: null,
      photoFilePath: null,
    })
  }

  async updateProfile(dto: UpdateHouseMomDto): Promise<HouseMomPublicDto> {
    const email = dto.email.trim().toLowerCase()
    if (email && !EMAIL_RE.test(email)) {
      throw new BadRequestException('Invalid email address')
    }

    const row = await this.getOrCreateRow()
    row.firstName = dto.firstName.trim()
    row.lastName = dto.lastName.trim()
    row.email = email
    row.phone = normalizeUsPhoneForStorage(dto.phone ?? null)
    row.bioHtml = dto.bioHtml === undefined || dto.bioHtml === null ? null : dto.bioHtml.trim() || null
    await row.save()

    const photoUrl = await this.signedPhotoUrl(row.photoFilePath)
    return this.toPublicDto(row, photoUrl)
  }

  async uploadPhoto(file: HouseMomPhotoFile): Promise<HouseMomPublicDto> {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)')
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB')
    }

    const row = await this.getOrCreateRow()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const ts = now.getTime()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `house-mom/${y}/${m}/${row.id}/${ts}-${safeName}`

    if (row.photoFilePath) {
      try {
        await this.storageService.deleteFile(row.photoFilePath)
      } catch {
        /* ignore */
      }
    }

    const uploaded = await this.storageService.uploadFile(file.buffer, filePath, file.mimetype)
    row.photoFilePath = uploaded
    await row.save()

    const photoUrl = await this.signedPhotoUrl(row.photoFilePath)
    return this.toPublicDto(row, photoUrl)
  }

  async clearPhoto(): Promise<HouseMomPublicDto> {
    const row = await this.houseMomModel.findOne({ order: [['createdAt', 'ASC']] })
    if (!row) {
      return {
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: null,
        bioHtml: null,
        photoUrl: null,
      }
    }
    if (row.photoFilePath) {
      try {
        await this.storageService.deleteFile(row.photoFilePath)
      } catch {
        /* ignore */
      }
      row.photoFilePath = null
      await row.save()
    }
    return this.toPublicDto(row, null)
  }
}
