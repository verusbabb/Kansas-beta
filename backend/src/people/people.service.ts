import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Person } from '../database/entities/person.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { CreatePersonDto, PersonKindDto } from './dto/create-person.dto'
import { UpdatePersonDto } from './dto/update-person.dto'
import { normalizeUsPhoneForStorage } from '../common/utils/us-phone'
import { PersonResponseDto } from './dto/person-response.dto'
import { PersonProfileResponseDto } from './dto/person-profile-response.dto'
import { BulkImportResponseDto } from './dto/bulk-import-response.dto'
import {
  formatSkippedImportRows,
  parsePeopleImportBuffer,
  type PeopleImportCreatePayload,
} from './people-import'
import { StorageService } from '../storage/storage.service'
import { PersonRelationshipsService } from '../person-relationships/person-relationships.service'
import { ExecTeamService } from '../exec-team/exec-team.service'

/** Match `ExecTeamService` roster headshot signed URL lifetime. */
const PROFILE_HEADSHOT_URL_EXPIRY_MINUTES = 7 * 24 * 60

export interface PersonHeadshotFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person)
    private personModel: typeof Person,
    @InjectModel(PersonRelationship)
    private personRelationshipModel: typeof PersonRelationship,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
    private readonly personRelationshipsService: PersonRelationshipsService,
    private readonly execTeamService: ExecTeamService,
  ) {
    this.logger.setContext(PeopleService.name)
  }

  private async headshotSignedUrlForPerson(person: Person): Promise<string | null> {
    if (!person.headshotFilePath) return null
    try {
      return await this.storageService.getSignedUrl(
        person.headshotFilePath,
        PROFILE_HEADSHOT_URL_EXPIRY_MINUTES,
      )
    } catch (e) {
      this.logger.warn('Profile headshot signed URL failed', { personId: person.id, error: e })
      return null
    }
  }

  private normalizeExternalContactId(value?: string | null): string | null {
    if (value == null) return null
    const t = String(value).trim()
    return t.length > 0 ? t : null
  }

  private emptyToNullText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null
    const t = String(value).trim()
    return t.length > 0 ? t : null
  }

  private applyImportPayload(person: Person, c: PeopleImportCreatePayload): void {
    person.firstName = c.firstName
    person.lastName = c.lastName
    person.addressLine1 = c.addressLine1
    person.city = c.city
    person.state = c.state
    person.zip = c.zip
    person.email = c.email
    person.homePhone = normalizeUsPhoneForStorage(c.homePhone || null)
    person.mobilePhone = normalizeUsPhoneForStorage(c.mobilePhone || null)
    person.pledgeClassYear = c.pledgeClassYear
    person.isMember = c.isMember
    person.isParent = c.isParent
    person.externalContactId = c.externalContactId
  }

  private flagsFromKind(kind: PersonKindDto): { isMember: boolean; isParent: boolean } {
    switch (kind) {
      case PersonKindDto.MEMBER:
        return { isMember: true, isParent: false }
      case PersonKindDto.PARENT:
        return { isMember: false, isParent: true }
      case PersonKindDto.BOTH:
        return { isMember: true, isParent: true }
      default:
        return { isMember: true, isParent: false }
    }
  }

  private toResponseDto(person: Person, hasLegacyMemberLink: boolean): PersonResponseDto {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      addressLine1: person.addressLine1,
      city: person.city,
      state: person.state,
      zip: person.zip,
      email: person.email,
      externalContactId: person.externalContactId ?? null,
      homePhone: person.homePhone ?? null,
      mobilePhone: person.mobilePhone ?? null,
      pledgeClassYear: person.pledgeClassYear ?? null,
      isMember: person.isMember,
      isParent: person.isParent,
      hasLegacyMemberLink,
      hasHeadshot: !!person.headshotFilePath,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    }
  }

  /**
   * Member↔member edges only (not parent↔member). Matches Legacy Connections in the directory UI.
   */
  private async legacyMemberLinkPersonIds(): Promise<Set<string>> {
    const rows = await this.personRelationshipModel.findAll({
      attributes: ['fromPersonId', 'toPersonId'],
      include: [
        {
          model: Person,
          as: 'fromPerson',
          attributes: ['isMember'],
          required: true,
        },
        {
          model: Person,
          as: 'toPerson',
          attributes: ['isMember'],
          required: true,
        },
      ],
    })
    const ids = new Set<string>()
    for (const r of rows) {
      if (r.fromPerson.isMember && r.toPerson.isMember) {
        ids.add(r.fromPersonId)
        ids.add(r.toPersonId)
      }
    }
    return ids
  }

  private async personHasLegacyMemberLink(personId: string): Promise<boolean> {
    const rows = await this.personRelationshipModel.findAll({
      where: {
        [Op.or]: [{ fromPersonId: personId }, { toPersonId: personId }],
      },
      include: [
        {
          model: Person,
          as: 'fromPerson',
          attributes: ['isMember'],
          required: true,
        },
        {
          model: Person,
          as: 'toPerson',
          attributes: ['isMember'],
          required: true,
        },
      ],
    })
    for (const r of rows) {
      if (!r.fromPerson.isMember || !r.toPerson.isMember) continue
      if (r.fromPersonId === personId || r.toPersonId === personId) return true
    }
    return false
  }

  /**
   * Create one person. Email is unique; soft-deleted row can be restored and updated.
   */
  async create(dto: CreatePersonDto): Promise<PersonResponseDto> {
    const { isMember, isParent } = this.flagsFromKind(dto.kind)
    const pledgeClassYear =
      isMember && dto.pledgeClassYear !== undefined && dto.pledgeClassYear !== null
        ? dto.pledgeClassYear
        : null

    const emailNorm = dto.email.toLowerCase().trim()
    const ext = this.normalizeExternalContactId(dto.externalContactId)

    const existing = await this.personModel.findOne({
      where: { email: emailNorm },
      paranoid: false,
    })

    if (existing) {
      if (existing.deletedAt) {
        if (ext) {
          const otherExt = await this.personModel.findOne({
            where: { externalContactId: ext },
            paranoid: false,
          })
          if (otherExt && otherExt.id !== existing.id) {
            throw new ConflictException('External contact ID is already in use')
          }
        }
        await existing.restore()
        existing.firstName = dto.firstName
        existing.lastName = dto.lastName
        existing.addressLine1 = this.emptyToNullText(dto.addressLine1)
        existing.city = this.emptyToNullText(dto.city)
        existing.state = dto.state ?? null
        existing.zip = this.emptyToNullText(dto.zip)
        existing.email = emailNorm
        existing.homePhone = normalizeUsPhoneForStorage(dto.homePhone)
        existing.mobilePhone = normalizeUsPhoneForStorage(dto.mobilePhone)
        existing.pledgeClassYear = pledgeClassYear
        existing.isMember = isMember
        existing.isParent = isParent
        existing.externalContactId = ext
        await existing.save()
        this.logger.info('Restored soft-deleted person', { id: existing.id, email: existing.email })
        return this.toResponseDto(existing, await this.personHasLegacyMemberLink(existing.id))
      }
      throw new ConflictException(`Person with email ${dto.email} already exists`)
    }

    if (ext) {
      const taken = await this.personModel.findOne({
        where: { externalContactId: ext },
        paranoid: false,
      })
      if (taken) {
        throw new ConflictException('External contact ID is already in use')
      }
    }

    const person = await this.personModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      addressLine1: this.emptyToNullText(dto.addressLine1),
      city: this.emptyToNullText(dto.city),
      state: dto.state ?? null,
      zip: this.emptyToNullText(dto.zip),
      email: emailNorm,
      homePhone: normalizeUsPhoneForStorage(dto.homePhone),
      mobilePhone: normalizeUsPhoneForStorage(dto.mobilePhone),
      pledgeClassYear,
      isMember,
      isParent,
      externalContactId: ext,
    })

    return this.toResponseDto(person, false)
  }

  /**
   * All non-deleted people, ordered for directory display.
   */
  async findAll(): Promise<PersonResponseDto[]> {
    const legacyIds = await this.legacyMemberLinkPersonIds()
    const rows = await this.personModel.findAll({
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })
    return rows.map((p) => this.toResponseDto(p, legacyIds.has(p.id)))
  }

  /**
   * Full profile for authenticated viewers (and above): directory row, connections, exec history.
   */
  async findProfileById(id: string): Promise<PersonProfileResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    const hasLegacy = await this.personHasLegacyMemberLink(person.id)
    const personDto = this.toResponseDto(person, hasLegacy)
    const [relationships, execHistory, headshotUrl] = await Promise.all([
      this.personRelationshipsService.findAllForPerson(id),
      this.execTeamService.findExecHistoryForPerson(id),
      this.headshotSignedUrlForPerson(person),
    ])
    return { person: personDto, headshotUrl, relationships, execHistory }
  }

  async update(id: string, dto: UpdatePersonDto): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }

    if (dto.email !== undefined) {
      const normalized = dto.email.toLowerCase().trim()
      if (normalized !== person.email) {
        const other = await this.personModel.findOne({
          where: { email: normalized },
          paranoid: false,
        })
        if (other && other.id !== id) {
          throw new ConflictException(`Person with email ${dto.email} already exists`)
        }
      }
    }

    let isMember = person.isMember
    let isParent = person.isParent
    if (dto.kind !== undefined) {
      const flags = this.flagsFromKind(dto.kind)
      isMember = flags.isMember
      isParent = flags.isParent
    }

    if (dto.firstName !== undefined) person.firstName = dto.firstName
    if (dto.lastName !== undefined) person.lastName = dto.lastName
    if (dto.addressLine1 !== undefined) {
      person.addressLine1 = this.emptyToNullText(dto.addressLine1)
    }
    if (dto.city !== undefined) {
      person.city = this.emptyToNullText(dto.city)
    }
    if (dto.state !== undefined) {
      person.state = dto.state === null ? null : String(dto.state).trim().toUpperCase()
    }
    if (dto.zip !== undefined) {
      person.zip = this.emptyToNullText(dto.zip)
    }
    if (dto.email !== undefined) person.email = dto.email.toLowerCase().trim()

    if (dto.externalContactId !== undefined) {
      const ext = this.normalizeExternalContactId(dto.externalContactId)
      if (ext) {
        const other = await this.personModel.findOne({
          where: { externalContactId: ext },
          paranoid: false,
        })
        if (other && other.id !== person.id) {
          throw new ConflictException('External contact ID is already in use')
        }
      }
      person.externalContactId = ext
    }

    if (dto.homePhone !== undefined) {
      person.homePhone = normalizeUsPhoneForStorage(dto.homePhone)
    }
    if (dto.mobilePhone !== undefined) {
      person.mobilePhone = normalizeUsPhoneForStorage(dto.mobilePhone)
    }

    person.isMember = isMember
    person.isParent = isParent

    if (!isMember) {
      person.pledgeClassYear = null
    } else if (dto.pledgeClassYear !== undefined) {
      person.pledgeClassYear = dto.pledgeClassYear
    }

    if (!person.isMember && !person.isParent) {
      throw new BadRequestException('Person must be a member, parent, or both')
    }

    await person.save()
    this.logger.info('Updated person', { id: person.id })
    return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id))
  }

  /**
   * Soft-delete a person (paranoid). Email can be reused via create restore path.
   */
  async remove(id: string): Promise<void> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    await person.destroy()
    this.logger.info('Soft-deleted person', { id })
  }

  async uploadHeadshot(id: string, file: PersonHeadshotFile): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    if (!person.isMember) {
      throw new BadRequestException('Headshots are only for chapter members')
    }

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)')
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB')
    }

    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const ts = now.getTime()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `people-headshots/${y}/${m}/${id}/${ts}-${safeName}`

    if (person.headshotFilePath) {
      try {
        await this.storageService.deleteFile(person.headshotFilePath)
      } catch {
        /* ignore */
      }
    }

    const uploaded = await this.storageService.uploadFile(file.buffer, filePath, file.mimetype)
    person.headshotFilePath = uploaded
    await person.save()
    this.logger.info('Uploaded person headshot', { id })
    return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id))
  }

  async clearHeadshot(id: string): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    if (person.headshotFilePath) {
      try {
        await this.storageService.deleteFile(person.headshotFilePath)
      } catch {
        /* ignore */
      }
      person.headshotFilePath = null
      await person.save()
    }
    return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id))
  }

  /**
   * Bulk import from CSV/TSV. Upserts by Contact ID (externalContactId); adopts rows matched by email
   * when externalContactId was previously unset. Skips invalid rows; returns skipped file content.
   */
  async bulkImportFromFile(buffer: Buffer): Promise<BulkImportResponseDto> {
    const { creates, skips, outputDelimiter } = parsePeopleImportBuffer(buffer)
    const allSkips = [...skips]

    if (creates.length === 0) {
      const skippedFileContent = formatSkippedImportRows(allSkips, outputDelimiter)
      return {
        importedCount: 0,
        skippedCount: allSkips.length,
        skippedFileContent,
        ...(allSkips.length > 0
          ? { skippedFileFormat: outputDelimiter === '\t' ? 'tsv' : 'csv' }
          : {}),
      }
    }

    const contactIds = [...new Set(creates.map((c) => c.externalContactId))]
    const emails = [...new Set(creates.map((c) => c.email))]

    const [byContact, byEmail] = await Promise.all([
      this.personModel.findAll({
        where: { externalContactId: { [Op.in]: contactIds } },
        paranoid: false,
      }),
      this.personModel.findAll({
        where: { email: { [Op.in]: emails } },
        paranoid: false,
      }),
    ])

    const byId = new Map<string, Person>()
    for (const p of [...byContact, ...byEmail]) {
      if (!byId.has(p.id)) byId.set(p.id, p)
    }
    const peopleList = [...byId.values()]

    const contactToPerson = new Map<string, Person>()
    const emailToPerson = new Map<string, Person>()
    for (const p of peopleList) {
      emailToPerson.set(p.email, p)
      if (p.externalContactId) contactToPerson.set(p.externalContactId, p)
    }

    let processed = 0
    const sequelize = this.personModel.sequelize
    if (!sequelize) {
      throw new BadRequestException('Database unavailable')
    }

    await sequelize.transaction(async (transaction) => {
      for (const c of creates) {
        let person = contactToPerson.get(c.externalContactId)

        if (person) {
          const emailOwner = emailToPerson.get(c.email)
          if (emailOwner && emailOwner.id !== person.id) {
            allSkips.push({
              sourceRow: c.sourceRow,
              raw: c.raw,
              reason: 'email_conflict',
            })
            continue
          }
          if (person.email !== c.email) {
            emailToPerson.delete(person.email)
          }
          if (person.deletedAt) {
            await person.restore({ transaction })
          }
          this.applyImportPayload(person, c)
          await person.save({ transaction })
          emailToPerson.set(c.email, person)
          contactToPerson.set(c.externalContactId, person)
          processed++
          continue
        }

        const emailPerson = emailToPerson.get(c.email)
        if (emailPerson) {
          if (
            emailPerson.externalContactId &&
            emailPerson.externalContactId !== c.externalContactId
          ) {
            allSkips.push({
              sourceRow: c.sourceRow,
              raw: c.raw,
              reason: 'email_belongs_to_different_contact',
            })
            continue
          }
          if (emailPerson.deletedAt) {
            await emailPerson.restore({ transaction })
          }
          this.applyImportPayload(emailPerson, c)
          await emailPerson.save({ transaction })
          contactToPerson.set(c.externalContactId, emailPerson)
          emailToPerson.set(c.email, emailPerson)
          processed++
          continue
        }

        const created = await this.personModel.create(
          {
            firstName: c.firstName,
            lastName: c.lastName,
            addressLine1: c.addressLine1,
            city: c.city,
            state: c.state,
            zip: c.zip,
            email: c.email,
            homePhone: normalizeUsPhoneForStorage(c.homePhone || null),
            mobilePhone: normalizeUsPhoneForStorage(c.mobilePhone || null),
            pledgeClassYear: c.pledgeClassYear,
            isMember: c.isMember,
            isParent: c.isParent,
            externalContactId: c.externalContactId,
          },
          { transaction },
        )
        contactToPerson.set(c.externalContactId, created)
        emailToPerson.set(c.email, created)
        processed++
      }
    })

    this.logger.info('Bulk people import completed', {
      processed,
      skipped: allSkips.length,
    })

    const skippedFileContent = formatSkippedImportRows(allSkips, outputDelimiter)
    return {
      importedCount: processed,
      skippedCount: allSkips.length,
      skippedFileContent,
      ...(allSkips.length > 0
        ? { skippedFileFormat: outputDelimiter === '\t' ? 'tsv' : 'csv' }
        : {}),
    }
  }
}
