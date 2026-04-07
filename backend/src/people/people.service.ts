import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Person } from '../database/entities/person.entity'
import { User, UserRole } from '../database/entities/user.entity'
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

  private async signedUrlForHeadshotPath(
    path: string | null | undefined,
    personId: string,
    logContext: string,
  ): Promise<string | null> {
    if (!path) return null
    try {
      return await this.storageService.getSignedUrl(path, PROFILE_HEADSHOT_URL_EXPIRY_MINUTES)
    } catch (e) {
      this.logger.warn(`${logContext} signed URL failed`, { personId, error: e })
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

  private personHasStoredPhone(value: string | null | undefined): boolean {
    if (value == null) return false
    return String(value).trim().length > 0
  }

  private viewerIsEditorOrAdmin(viewer: User | undefined): boolean {
    return viewer?.role === UserRole.EDITOR || viewer?.role === UserRole.ADMIN
  }

  private isSelfView(viewer: User | undefined, person: Person): boolean {
    if (!viewer) return false
    if (viewer.personId && viewer.personId === person.id) return true
    return viewer.email.trim().toLowerCase() === person.email.trim().toLowerCase()
  }

  private personHasAddress(person: Person): boolean {
    return !!(
      person.addressLine1?.trim() ||
      person.city?.trim() ||
      person.state?.trim() ||
      person.zip?.trim()
    )
  }

  private hasLinkedInStored(person: Person): boolean {
    return !!(person.linkedinProfileUrl && String(person.linkedinProfileUrl).trim())
  }

  /**
   * @param options.fullDetail — editor/admin directory list and admin mutation responses (raw row + share flags).
   */
  private toResponseDto(
    person: Person,
    hasLegacyMemberLink: boolean,
    options: { viewer?: User; fullDetail?: boolean } = {},
  ): PersonResponseDto {
    const fullDetail = options.fullDetail === true
    const viewer = options.viewer
    const self = this.isSelfView(viewer, person)
    const guest = !viewer

    let redactEmail = false
    let redactPhones = false
    let redactAddress = false
    let redactLinkedIn = false
    let redactExternalId = false

    if (!fullDetail) {
      redactExternalId = guest
      if (guest) {
        redactEmail = true
        redactPhones = true
        redactAddress = true
        redactLinkedIn = true
      } else if (!self) {
        redactEmail = !person.shareEmailWithLoggedInMembers
        redactPhones = !person.sharePhonesWithLoggedInMembers
        redactAddress = !person.shareAddressWithLoggedInMembers
        redactLinkedIn = !person.shareLinkedInWithLoggedInMembers
      }
    }

    const hasMobilePhone = this.personHasStoredPhone(person.mobilePhone)
    const hasHomePhone = this.personHasStoredPhone(person.homePhone)
    const hasEmailOnFile = !!person.email?.trim()
    const hasAddressOnFile = this.personHasAddress(person)
    const hasLinkedInOnFile = this.hasLinkedInStored(person)
    const includeShareFlags = fullDetail || self

    const dto: PersonResponseDto = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      addressLine1: redactAddress ? null : person.addressLine1,
      city: redactAddress ? null : person.city,
      state: redactAddress ? null : person.state,
      zip: redactAddress ? null : person.zip,
      email: redactEmail ? null : person.email,
      hasEmailOnFile,
      externalContactId: redactExternalId ? null : (person.externalContactId ?? null),
      homePhone: redactPhones ? null : (person.homePhone ?? null),
      mobilePhone: redactPhones ? null : (person.mobilePhone ?? null),
      hasMobilePhone,
      hasHomePhone,
      pledgeClassYear: person.pledgeClassYear ?? null,
      isMember: person.isMember,
      isParent: person.isParent,
      hasLegacyMemberLink,
      hasProfileHeadshot: !!person.profileHeadshotFilePath,
      hasExecRosterHeadshot: !!person.execRosterHeadshotFilePath,
      linkedinProfileUrl: redactLinkedIn ? null : (person.linkedinProfileUrl ?? null),
      hasLinkedInOnFile,
      hasAddressOnFile,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    }

    if (includeShareFlags) {
      dto.shareEmailWithLoggedInMembers = person.shareEmailWithLoggedInMembers
      dto.sharePhonesWithLoggedInMembers = person.sharePhonesWithLoggedInMembers
      dto.shareAddressWithLoggedInMembers = person.shareAddressWithLoggedInMembers
      dto.shareLinkedInWithLoggedInMembers = person.shareLinkedInWithLoggedInMembers
    }

    return dto
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
        if (dto.linkedinProfileUrl !== undefined) {
          existing.linkedinProfileUrl = this.emptyToNullText(dto.linkedinProfileUrl)
        }
        await existing.save()
        this.logger.info('Restored soft-deleted person', { id: existing.id, email: existing.email })
        return this.toResponseDto(existing, await this.personHasLegacyMemberLink(existing.id), {
          fullDetail: true,
        })
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
      linkedinProfileUrl: this.emptyToNullText(dto.linkedinProfileUrl),
    })

    return this.toResponseDto(person, false, { fullDetail: true })
  }

  /**
   * All non-deleted people, ordered for directory display.
   */
  async findAll(viewer?: User): Promise<PersonResponseDto[]> {
    const fullDetail = this.viewerIsEditorOrAdmin(viewer)
    const legacyIds = await this.legacyMemberLinkPersonIds()
    const rows = await this.personModel.findAll({
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })
    return rows.map((p) =>
      this.toResponseDto(p, legacyIds.has(p.id), { viewer, fullDetail }),
    )
  }

  /**
   * Full profile for authenticated viewers (and above): directory row, connections, exec history.
   */
  async findProfileById(id: string, viewer?: User): Promise<PersonProfileResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    const hasLegacy = await this.personHasLegacyMemberLink(person.id)
    const personDto = this.toResponseDto(person, hasLegacy, { viewer })
    const [relationships, execHistory, headshotUrl, execRosterHeadshotUrl] = await Promise.all([
      this.personRelationshipsService.findAllForPerson(id, viewer),
      this.execTeamService.findExecHistoryForPerson(id),
      this.signedUrlForHeadshotPath(
        person.profileHeadshotFilePath,
        person.id,
        'Profile headshot',
      ),
      this.signedUrlForHeadshotPath(
        person.execRosterHeadshotFilePath,
        person.id,
        'Exec roster headshot',
      ),
    ])
    return { person: personDto, headshotUrl, execRosterHeadshotUrl, relationships, execHistory }
  }

  async update(id: string, dto: UpdatePersonDto, currentUser: User): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }

    const isEditor = currentUser.role === UserRole.EDITOR || currentUser.role === UserRole.ADMIN
    const isSelf = this.isSelfView(currentUser, person)
    if (!isEditor && !isSelf) {
      throw new ForbiddenException(
        'You can only update your own directory profile unless you are an editor or admin.',
      )
    }

    if (isSelf && !isEditor) {
      const accountLinked =
        currentUser.personId != null && currentUser.personId === person.id
      await this.applySelfPersonPatch(person, dto, accountLinked)
      if (!person.isMember && !person.isParent) {
        throw new BadRequestException('Person must be a member, parent, or both')
      }
      await person.save()
      this.logger.info('Self-updated person', { id: person.id })
      return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id), {
        viewer: currentUser,
      })
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

    if (dto.linkedinProfileUrl !== undefined) {
      person.linkedinProfileUrl =
        dto.linkedinProfileUrl === null ? null : this.emptyToNullText(dto.linkedinProfileUrl)
    }

    if (dto.homePhone !== undefined) {
      person.homePhone = normalizeUsPhoneForStorage(dto.homePhone)
    }
    if (dto.mobilePhone !== undefined) {
      person.mobilePhone = normalizeUsPhoneForStorage(dto.mobilePhone)
    }

    if (dto.shareEmailWithLoggedInMembers !== undefined) {
      person.shareEmailWithLoggedInMembers = dto.shareEmailWithLoggedInMembers
    }
    if (dto.sharePhonesWithLoggedInMembers !== undefined) {
      person.sharePhonesWithLoggedInMembers = dto.sharePhonesWithLoggedInMembers
    }
    if (dto.shareAddressWithLoggedInMembers !== undefined) {
      person.shareAddressWithLoggedInMembers = dto.shareAddressWithLoggedInMembers
    }
    if (dto.shareLinkedInWithLoggedInMembers !== undefined) {
      person.shareLinkedInWithLoggedInMembers = dto.shareLinkedInWithLoggedInMembers
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
    return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id), {
      fullDetail: true,
    })
  }

  /**
   * Self-service: no `kind` / `externalContactId` / `email`.
   * Contact fields require `users.personId` to match this person; otherwise only share toggles apply.
   */
  private selfPatchHasNonShareFields(dto: UpdatePersonDto): boolean {
    const keys: (keyof UpdatePersonDto)[] = [
      'kind',
      'firstName',
      'lastName',
      'addressLine1',
      'city',
      'state',
      'zip',
      'email',
      'externalContactId',
      'homePhone',
      'mobilePhone',
      'linkedinProfileUrl',
      'pledgeClassYear',
    ]
    return keys.some((k) => dto[k] !== undefined)
  }

  private applySelfShareFlags(person: Person, dto: UpdatePersonDto): void {
    if (dto.shareEmailWithLoggedInMembers !== undefined) {
      person.shareEmailWithLoggedInMembers = dto.shareEmailWithLoggedInMembers
    }
    if (dto.sharePhonesWithLoggedInMembers !== undefined) {
      person.sharePhonesWithLoggedInMembers = dto.sharePhonesWithLoggedInMembers
    }
    if (dto.shareAddressWithLoggedInMembers !== undefined) {
      person.shareAddressWithLoggedInMembers = dto.shareAddressWithLoggedInMembers
    }
    if (dto.shareLinkedInWithLoggedInMembers !== undefined) {
      person.shareLinkedInWithLoggedInMembers = dto.shareLinkedInWithLoggedInMembers
    }
  }

  private async applySelfPersonPatch(
    person: Person,
    dto: UpdatePersonDto,
    accountLinkedToPerson: boolean,
  ): Promise<void> {
    if (dto.email !== undefined) {
      throw new BadRequestException(
        'Directory email cannot be changed here; it is tied to your login. Ask an administrator to update your account email if needed.',
      )
    }

    if (!accountLinkedToPerson) {
      if (this.selfPatchHasNonShareFields(dto)) {
        throw new ForbiddenException(
          'Your account must be linked to this directory profile before updating contact details. Sign out and sign in again, or ask an administrator. You can still change who can see your information.',
        )
      }
      this.applySelfShareFlags(person, dto)
      return
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

    if (dto.linkedinProfileUrl !== undefined) {
      person.linkedinProfileUrl =
        dto.linkedinProfileUrl === null ? null : this.emptyToNullText(dto.linkedinProfileUrl)
    }

    if (dto.homePhone !== undefined) {
      person.homePhone = normalizeUsPhoneForStorage(dto.homePhone)
    }
    if (dto.mobilePhone !== undefined) {
      person.mobilePhone = normalizeUsPhoneForStorage(dto.mobilePhone)
    }

    if (dto.pledgeClassYear !== undefined) {
      if (!person.isMember) {
        if (dto.pledgeClassYear != null) {
          throw new BadRequestException('Pledge class year applies to members only')
        }
      } else {
        person.pledgeClassYear = dto.pledgeClassYear
      }
    }

    this.applySelfShareFlags(person, dto)
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

  /**
   * Editors/admins may set any person's photos. Linked users may set their own row only.
   */
  private assertCanMutatePersonPhotos(person: Person, user: User): void {
    const isEditor = user.role === UserRole.EDITOR || user.role === UserRole.ADMIN
    if (isEditor) return
    const linked = user.personId != null && user.personId === person.id
    if (!linked) {
      throw new ForbiddenException(
        'You can only upload or remove photos for your own linked directory profile.',
      )
    }
  }

  private validatePersonHeadshotFile(file: PersonHeadshotFile): void {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.mimetype || !validImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be an image (JPEG, PNG, WebP, or GIF)')
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB')
    }
  }

  private async replacePersonHeadshotAt(
    person: Person,
    file: PersonHeadshotFile,
    column: 'profileHeadshotFilePath' | 'execRosterHeadshotFilePath',
    gcsFolder: string,
  ): Promise<void> {
    this.validatePersonHeadshotFile(file)
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const ts = now.getTime()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${gcsFolder}/${y}/${m}/${person.id}/${ts}-${safeName}`
    const oldPath = person[column]
    if (oldPath) {
      try {
        await this.storageService.deleteFile(oldPath)
      } catch {
        /* ignore */
      }
    }
    const uploaded = await this.storageService.uploadFile(file.buffer, filePath, file.mimetype)
    person[column] = uploaded
    await person.save()
  }

  private async clearPersonHeadshotAt(
    person: Person,
    column: 'profileHeadshotFilePath' | 'execRosterHeadshotFilePath',
  ): Promise<void> {
    const oldPath = person[column]
    if (!oldPath) return
    try {
      await this.storageService.deleteFile(oldPath)
    } catch {
      /* ignore */
    }
    person[column] = null
    await person.save()
  }

  private async headshotMutationResponse(person: Person, currentUser: User): Promise<PersonResponseDto> {
    const hasLegacy = await this.personHasLegacyMemberLink(person.id)
    const isEditor = currentUser.role === UserRole.EDITOR || currentUser.role === UserRole.ADMIN
    return this.toResponseDto(person, hasLegacy, isEditor ? { fullDetail: true } : { viewer: currentUser })
  }

  async uploadProfileHeadshot(id: string, file: PersonHeadshotFile, currentUser: User): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    this.assertCanMutatePersonPhotos(person, currentUser)
    if (!person.isMember && !person.isParent) {
      throw new BadRequestException('Profile photos are only for directory members and parents')
    }
    await this.replacePersonHeadshotAt(person, file, 'profileHeadshotFilePath', 'people-profile-headshots')
    this.logger.info('Uploaded profile headshot', { id })
    return this.headshotMutationResponse(person, currentUser)
  }

  async clearProfileHeadshot(id: string, currentUser: User): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    this.assertCanMutatePersonPhotos(person, currentUser)
    await this.clearPersonHeadshotAt(person, 'profileHeadshotFilePath')
    return this.headshotMutationResponse(person, currentUser)
  }

  async uploadExecRosterHeadshot(
    id: string,
    file: PersonHeadshotFile,
    currentUser: User,
  ): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    this.assertCanMutatePersonPhotos(person, currentUser)
    if (!person.isMember) {
      throw new BadRequestException('Executive roster photos are only for chapter members')
    }
    await this.replacePersonHeadshotAt(person, file, 'execRosterHeadshotFilePath', 'people-exec-headshots')
    this.logger.info('Uploaded exec roster headshot', { id })
    return this.headshotMutationResponse(person, currentUser)
  }

  async clearExecRosterHeadshot(id: string, currentUser: User): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    this.assertCanMutatePersonPhotos(person, currentUser)
    await this.clearPersonHeadshotAt(person, 'execRosterHeadshotFilePath')
    return this.headshotMutationResponse(person, currentUser)
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
