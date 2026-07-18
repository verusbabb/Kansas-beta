import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Resource } from '../database/entities/resource.entity'
import { ResourceVersion } from '../database/entities/resource-version.entity'
import { User } from '../database/entities/user.entity'
import { StorageService } from '../storage/storage.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'
import { ResourceResponseDto, ResourceVersionDto } from './dto/resource-response.dto'

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource)
    private resourceModel: typeof Resource,
    @InjectModel(ResourceVersion)
    private resourceVersionModel: typeof ResourceVersion,
    @InjectModel(User)
    private userModel: typeof User,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResourcesService.name)
  }

  async create(
    dto: CreateResourceDto,
    file: UploadedFile,
    uploadedBy: string,
  ): Promise<ResourceResponseDto> {
    this.validateFile(file)

    const resource = await this.resourceModel.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      tag: dto.tag,
      uploadedBy,
    })

    const version = await this.uploadVersion(resource.id, file, 1, uploadedBy)
    const nameMap = await this.buildNameMap([uploadedBy])
    return this.toResponseDto(resource, version, nameMap)
  }

  async findAll(): Promise<ResourceResponseDto[]> {
    const resources = await this.resourceModel.findAll({
      order: [['createdAt', 'DESC']],
    })

    const nameMap = await this.buildNameMap(resources.map((r) => r.uploadedBy))

    const results: ResourceResponseDto[] = []
    for (const resource of resources) {
      const currentVersion = await this.getCurrentVersion(resource.id)
      results.push(this.toResponseDto(resource, currentVersion, nameMap))
    }
    return results
  }

  async findOne(id: string): Promise<ResourceResponseDto> {
    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)

    const currentVersion = await this.getCurrentVersion(id)
    const nameMap = await this.buildNameMap([resource.uploadedBy])
    return this.toResponseDto(resource, currentVersion, nameMap)
  }

  async update(id: string, dto: UpdateResourceDto): Promise<ResourceResponseDto> {
    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)

    if (dto.title !== undefined) resource.title = dto.title.trim()
    if (dto.description !== undefined) resource.description = dto.description?.trim() || null
    if (dto.tag !== undefined) resource.tag = dto.tag
    await resource.save()

    const currentVersion = await this.getCurrentVersion(id)
    const nameMap = await this.buildNameMap([resource.uploadedBy])
    return this.toResponseDto(resource, currentVersion, nameMap)
  }

  async replaceFile(
    id: string,
    file: UploadedFile,
    uploadedBy: string,
  ): Promise<ResourceResponseDto> {
    this.validateFile(file)

    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)

    const latestVersion = await this.getCurrentVersion(id)
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

    const newVersion = await this.uploadVersion(id, file, nextVersionNumber, uploadedBy)
    const nameMap = await this.buildNameMap([resource.uploadedBy, uploadedBy])
    return this.toResponseDto(resource, newVersion, nameMap)
  }

  async getVersions(id: string): Promise<ResourceVersionDto[]> {
    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)

    const versions = await this.resourceVersionModel.findAll({
      where: { resourceId: id },
      order: [['versionNumber', 'DESC']],
    })

    const nameMap = await this.buildNameMap(versions.map((v) => v.uploadedBy))
    return versions.map((v) => this.toVersionDto(v, nameMap))
  }

  async getDownloadUrl(id: string, versionId?: string): Promise<string> {
    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)

    let version: ResourceVersion | null
    if (versionId) {
      version = await this.resourceVersionModel.findOne({
        where: { id: versionId, resourceId: id },
      })
      if (!version) throw new NotFoundException(`Version ${versionId} not found`)
    } else {
      version = await this.getCurrentVersion(id)
      if (!version) throw new NotFoundException(`Resource ${id} has no files`)
    }

    return this.storageService.getDownloadSignedUrl(version.filePath, version.originalFilename, 60)
  }

  async remove(id: string): Promise<void> {
    const resource = await this.resourceModel.findByPk(id)
    if (!resource) throw new NotFoundException(`Resource ${id} not found`)
    await resource.destroy()
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private validateFile(file: UploadedFile): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, plain text, CSV.',
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must be less than 50MB')
    }
  }

  private async uploadVersion(
    resourceId: string,
    file: UploadedFile,
    versionNumber: number,
    uploadedBy: string,
  ): Promise<ResourceVersion> {
    const timestamp = Date.now()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `resources/${resourceId}/v${versionNumber}-${timestamp}-${safeName}`

    await this.storageService.uploadFile(file.buffer, filePath, file.mimetype)

    return this.resourceVersionModel.create({
      resourceId,
      filePath,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      fileSize: file.size,
      versionNumber,
      uploadedBy,
    })
  }

  private async getCurrentVersion(resourceId: string): Promise<ResourceVersion | null> {
    return this.resourceVersionModel.findOne({
      where: { resourceId },
      order: [['versionNumber', 'DESC']],
    })
  }

  /** Resolve a list of emails to a displayName map in a single DB query. */
  private async buildNameMap(emails: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(emails.filter(Boolean))]
    if (!unique.length) return new Map()
    const users = await this.userModel.findAll({ where: { email: { [Op.in]: unique } } })
    const map = new Map<string, string>()
    for (const u of users) {
      map.set(u.email, `${u.firstName} ${u.lastName}`)
    }
    return map
  }

  private toVersionDto(
    version: ResourceVersion,
    nameMap: Map<string, string> = new Map(),
  ): ResourceVersionDto {
    return {
      id: version.id,
      resourceId: version.resourceId,
      filePath: version.filePath,
      originalFilename: version.originalFilename,
      contentType: version.contentType,
      fileSize: version.fileSize,
      versionNumber: version.versionNumber,
      uploadedBy: nameMap.get(version.uploadedBy) ?? version.uploadedBy,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    }
  }

  private toResponseDto(
    resource: Resource,
    currentVersion: ResourceVersion | null,
    nameMap: Map<string, string> = new Map(),
  ): ResourceResponseDto {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      tag: resource.tag,
      uploadedBy: nameMap.get(resource.uploadedBy) ?? resource.uploadedBy,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      currentVersion: currentVersion ? this.toVersionDto(currentVersion, nameMap) : null,
    }
  }
}
