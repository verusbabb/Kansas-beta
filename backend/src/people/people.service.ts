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
import { MemberFamilyImportResponseDto } from './dto/member-family-import-response.dto'
import {
  formatSkippedImportRows,
  parsePeopleImportBuffer,
  type PeopleImportCreatePayload,
} from './people-import'
import {
  parseMemberFamilyImportBuffer,
  type FamilyImportPersonPayload,
  type FamilyImportMemberPayload,
} from './people-member-family-import'
import { StorageService } from '../storage/storage.service'
import { PersonRelationshipsService } from '../person-relationships/person-relationships.service'
import { ExecTeamService } from '../exec-team/exec-team.service'
import { IndexingService } from '../knowledge/indexing.service'
import { Auth0ManagementService } from '../auth0/auth0-management.service'
import { UsersService } from '../users/users.service'

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
    @InjectModel(User)
    private userModel: typeof User,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
    private readonly personRelationshipsService: PersonRelationshipsService,
    private readonly execTeamService: ExecTeamService,
    private readonly indexingService: IndexingService,
    private readonly auth0: Auth0ManagementService,
    private readonly usersService: UsersService,
  ) {
    this.logger.setContext(PeopleService.name)
  }

  async exportCsv(): Promise<string> {
    const EXPORT_COLUMNS = [
      'firstName',
      'lastName',
      'personalEmail',
      'workEmail',
      'employer',
      'jobTitle',
      'homePhone',
      'mobilePhone',
      'addressLine1',
      'city',
      'state',
      'zip',
      'linkedinProfileUrl',
      'pledgeClassYear',
      'isMember',
      'isParent',
      'externalContactId',
    ] as const

    const rows = await this.personModel.findAll({ attributes: [...EXPORT_COLUMNS] })

    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const header = EXPORT_COLUMNS.join(',')
    const lines = rows.map((r) => EXPORT_COLUMNS.map((col) => escape(r[col])).join(','))
    return [header, ...lines].join('\r\n')
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
    person.personalEmail = c.email
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

  /** Full directory row (all PII + share flags) — admins only. Editors see the same redaction as viewers. */
  private viewerIsAdmin(viewer: User | undefined): boolean {
    return viewer?.role === UserRole.ADMIN
  }

  private isSelfView(viewer: User | undefined, person: Person): boolean {
    if (!viewer) return false
    if (viewer.personId && viewer.personId === person.id) return true
    return viewer.email.trim().toLowerCase() === person.personalEmail.trim().toLowerCase()
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
   * @param options.fullDetail — admin directory list and admin mutation responses (raw row + share flags).
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
    let redactWorkEmail = false
    let redactEmployer = false
    let redactPhones = false
    let redactAddress = false
    let redactLinkedIn = false
    let redactExternalId = false

    if (!fullDetail) {
      redactExternalId = guest
      if (guest) {
        redactEmail = true
        redactWorkEmail = true
        redactEmployer = true
        redactPhones = true
        redactAddress = true
        redactLinkedIn = true
      } else if (!self) {
        redactEmail = !person.shareEmailWithLoggedInMembers
        redactWorkEmail = !person.shareWorkEmailWithLoggedInMembers
        redactEmployer = !person.shareEmployerWithLoggedInMembers
        redactPhones = !person.sharePhonesWithLoggedInMembers
        redactAddress = !person.shareAddressWithLoggedInMembers
        redactLinkedIn = !person.shareLinkedInWithLoggedInMembers
      }
    }

    const hasMobilePhone = this.personHasStoredPhone(person.mobilePhone)
    const hasHomePhone = this.personHasStoredPhone(person.homePhone)
    const hasEmailOnFile = !!person.personalEmail?.trim()
    const hasWorkEmailOnFile = !!person.workEmail?.trim()
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
      personalEmail: redactEmail ? null : person.personalEmail,
      hasEmailOnFile,
      workEmail: redactWorkEmail ? null : (person.workEmail ?? null),
      hasWorkEmailOnFile,
      employer: redactEmployer ? null : (person.employer ?? null),
      jobTitle: redactEmployer ? null : (person.jobTitle ?? null),
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
      dto.shareWorkEmailWithLoggedInMembers = person.shareWorkEmailWithLoggedInMembers
      dto.shareEmployerWithLoggedInMembers = person.shareEmployerWithLoggedInMembers
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

    const emailNorm = dto.personalEmail.toLowerCase().trim()
    const workEmailNorm = dto.workEmail ? dto.workEmail.toLowerCase().trim() : null
    const ext = this.normalizeExternalContactId(dto.externalContactId)

    const existing = await this.personModel.findOne({
      where: { personalEmail: emailNorm },
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
        existing.personalEmail = emailNorm
        if (workEmailNorm !== null) existing.workEmail = workEmailNorm
        if (dto.employer !== undefined) existing.employer = this.emptyToNullText(dto.employer)
        if (dto.jobTitle !== undefined) existing.jobTitle = this.emptyToNullText(dto.jobTitle)
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
        this.logger.info('Restored soft-deleted person', {
          id: existing.id,
          personalEmail: existing.personalEmail,
        })
        void this.indexingService.indexOnePerson(existing)
        return this.toResponseDto(existing, await this.personHasLegacyMemberLink(existing.id), {
          fullDetail: true,
        })
      }
      throw new ConflictException(`Person with email ${dto.personalEmail} already exists`)
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
      personalEmail: emailNorm,
      workEmail: workEmailNorm,
      employer: this.emptyToNullText(dto.employer),
      jobTitle: this.emptyToNullText(dto.jobTitle),
      homePhone: normalizeUsPhoneForStorage(dto.homePhone),
      mobilePhone: normalizeUsPhoneForStorage(dto.mobilePhone),
      pledgeClassYear,
      isMember,
      isParent,
      externalContactId: ext,
      linkedinProfileUrl: this.emptyToNullText(dto.linkedinProfileUrl),
    })

    void this.indexingService.indexOnePerson(person)
    return this.toResponseDto(person, false, { fullDetail: true })
  }

  /**
   * All non-deleted people, ordered for directory display.
   */
  async findAll(viewer?: User): Promise<PersonResponseDto[]> {
    const fullDetail = this.viewerIsAdmin(viewer)
    const legacyIds = await this.legacyMemberLinkPersonIds()
    const rows = await this.personModel.findAll({
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })
    return rows.map((p) => this.toResponseDto(p, legacyIds.has(p.id), { viewer, fullDetail }))
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
    const profileFullDetail = this.viewerIsAdmin(viewer)
    const personDto = this.toResponseDto(person, hasLegacy, {
      viewer,
      fullDetail: profileFullDetail,
    })
    const [relationships, execHistory, headshotUrl, execRosterHeadshotUrl] = await Promise.all([
      this.personRelationshipsService.findAllForPerson(id, viewer),
      this.execTeamService.findExecHistoryForPerson(id),
      this.signedUrlForHeadshotPath(person.profileHeadshotFilePath, person.id, 'Profile headshot'),
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

    const isAdmin = currentUser.role === UserRole.ADMIN
    const isSelf = this.isSelfView(currentUser, person)

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(
        'Only site administrators can update another person’s directory record. You can update only your own profile.',
      )
    }

    // Non-admin self-edit: restricted fields only
    if (isSelf && !isAdmin) {
      const accountLinked = currentUser.personId != null && currentUser.personId === person.id
      await this.applySelfPersonPatch(person, dto, accountLinked)
      if (!person.isMember && !person.isParent) {
        throw new BadRequestException('Person must be a member, parent, or both')
      }
      await person.save()
      this.logger.info('Self-updated person', { id: person.id })
      void this.indexingService.indexOnePerson(person)
      return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id), {
        viewer: currentUser,
      })
    }

    // Admin path: full edit rights on any record, including own
    const emailBeforeUpdate = person.personalEmail
    if (dto.personalEmail !== undefined) {
      const normalized = dto.personalEmail.toLowerCase().trim()
      if (normalized !== person.personalEmail) {
        const other = await this.personModel.findOne({
          where: { personalEmail: normalized },
          paranoid: false,
        })
        if (other && other.id !== id) {
          throw new ConflictException(`Person with email ${dto.personalEmail} already exists`)
        }

        // Prevent out-of-sync state: reject if a user account with this email
        // is already linked to a different directory person
        const conflictingUser = await this.userModel.findOne({
          where: { email: normalized },
          paranoid: false,
        })
        if (conflictingUser && conflictingUser.personId !== id) {
          throw new ConflictException(
            `A user account with email ${normalized} already exists and belongs to a different person`,
          )
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
    if (dto.personalEmail !== undefined)
      person.personalEmail = dto.personalEmail.toLowerCase().trim()
    if (dto.workEmail !== undefined) {
      person.workEmail = dto.workEmail === null ? null : dto.workEmail.toLowerCase().trim() || null
    }
    if (dto.employer !== undefined) {
      person.employer = dto.employer === null ? null : this.emptyToNullText(dto.employer)
    }
    if (dto.jobTitle !== undefined) {
      person.jobTitle = dto.jobTitle === null ? null : this.emptyToNullText(dto.jobTitle)
    }

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
    if (dto.shareWorkEmailWithLoggedInMembers !== undefined) {
      person.shareWorkEmailWithLoggedInMembers = dto.shareWorkEmailWithLoggedInMembers
    }
    if (dto.shareEmployerWithLoggedInMembers !== undefined) {
      person.shareEmployerWithLoggedInMembers = dto.shareEmployerWithLoggedInMembers
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
    void this.indexingService.indexOnePerson(person)

    // If personal email actually changed, sync to Auth0 for any linked app user
    if (dto.personalEmail !== undefined) {
      const normalizedNew = dto.personalEmail.toLowerCase().trim()
      if (normalizedNew !== emailBeforeUpdate) {
        await this.syncPersonEmailToAuth0(person.id, normalizedNew)
      }
    }

    return this.toResponseDto(person, await this.personHasLegacyMemberLink(person.id), {
      fullDetail: true,
    })
  }

  /**
   * Self-service: no `kind` / `externalContactId` / `personalEmail`.
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
      'personalEmail',
      'workEmail',
      'employer',
      'jobTitle',
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
    if (dto.shareWorkEmailWithLoggedInMembers !== undefined) {
      person.shareWorkEmailWithLoggedInMembers = dto.shareWorkEmailWithLoggedInMembers
    }
    if (dto.shareEmployerWithLoggedInMembers !== undefined) {
      person.shareEmployerWithLoggedInMembers = dto.shareEmployerWithLoggedInMembers
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
    if (dto.personalEmail !== undefined) {
      throw new BadRequestException(
        'Personal email cannot be changed here; it is tied to your login. Use the email field in your profile to update it.',
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

    if (dto.workEmail !== undefined) {
      person.workEmail = dto.workEmail === null ? null : dto.workEmail.toLowerCase().trim() || null
    }
    if (dto.employer !== undefined) {
      person.employer = dto.employer === null ? null : this.emptyToNullText(dto.employer)
    }
    if (dto.jobTitle !== undefined) {
      person.jobTitle = dto.jobTitle === null ? null : this.emptyToNullText(dto.jobTitle)
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
   * When an admin changes a person's email, update the linked app user's email in Auth0.
   * Admin-driven change → trusted, mark email as verified.
   */
  private async syncPersonEmailToAuth0(personId: string, newEmail: string): Promise<void> {
    try {
      const linkedUser = await this.userModel.findOne({
        where: { personId },
      })
      if (!linkedUser) return

      // Always keep users.email in sync with people.personalEmail
      if (linkedUser.email !== newEmail) {
        linkedUser.email = newEmail
        await linkedUser.save()
      }

      // If the user has an Auth0 account, update it there too
      if (linkedUser.auth0Id) {
        await this.auth0.updateEmail(linkedUser.auth0Id, newEmail, true)
        this.logger.info('Synced person email change to users table and Auth0', {
          personId,
          newEmail,
          auth0Id: linkedUser.auth0Id,
        })
      } else {
        this.logger.info('Synced person email change to users table (no Auth0 account yet)', {
          personId,
          newEmail,
        })
      }
    } catch (error) {
      this.logger.warn('Failed to fully sync person email change', {
        personId,
        newEmail,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Remove a person from the directory (admin only).
   *
   * Cascade: soft-deletes the person (paranoid — preserves relationships/history and
   * lets the email be reused via the create restore path) AND hard-deletes any linked
   * app user + their Auth0 identity, so the person can no longer log in and no stale
   * user row blocks a future re-enrollment. The DB steps run in one transaction;
   * Auth0 cleanup (external, non-transactional) runs after commit.
   *
   * @param actingUser the admin performing the removal, used to prevent self-lockout.
   */
  async remove(id: string, actingUser?: User): Promise<void> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }

    const email = person.personalEmail?.trim().toLowerCase() || null

    // Self-lockout guard: an admin cannot remove their own directory record.
    if (actingUser) {
      const isSelf =
        (actingUser.personId != null && actingUser.personId === id) ||
        (!!email && actingUser.email.trim().toLowerCase() === email)
      if (isSelf) {
        throw new BadRequestException('You cannot remove your own directory record')
      }
    }

    const sequelize = this.personModel.sequelize!
    const auth0Targets = await sequelize.transaction(async (transaction) => {
      const targets = await this.usersService.hardDeleteUsersForDirectoryPerson(
        { personId: id, email, actingUserId: actingUser?.id },
        transaction,
      )
      await person.destroy({ transaction })
      return targets
    })

    this.logger.info({ id, removedUsers: auth0Targets.length }, 'Removed person from directory')
    void this.indexingService.deletePersonIndex(id)

    await this.usersService.deleteAuth0Identities(auth0Targets)
  }

  /**
   * Admins may set any person's photos. Other users may change only their own linked row.
   */
  private assertCanMutatePersonPhotos(person: Person, user: User): void {
    if (user.role === UserRole.ADMIN) return
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

  private async headshotMutationResponse(
    person: Person,
    currentUser: User,
  ): Promise<PersonResponseDto> {
    const hasLegacy = await this.personHasLegacyMemberLink(person.id)
    const viewerIsAdmin = currentUser.role === UserRole.ADMIN
    return this.toResponseDto(
      person,
      hasLegacy,
      viewerIsAdmin ? { fullDetail: true } : { viewer: currentUser },
    )
  }

  async uploadProfileHeadshot(
    id: string,
    file: PersonHeadshotFile,
    currentUser: User,
  ): Promise<PersonResponseDto> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    this.assertCanMutatePersonPhotos(person, currentUser)
    if (!person.isMember && !person.isParent) {
      throw new BadRequestException('Profile photos are only for directory members and parents')
    }
    await this.replacePersonHeadshotAt(
      person,
      file,
      'profileHeadshotFilePath',
      'people-profile-headshots',
    )
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
    await this.replacePersonHeadshotAt(
      person,
      file,
      'execRosterHeadshotFilePath',
      'people-exec-headshots',
    )
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
   * Member + family import. Each CSV row represents one member with optional mom/dad columns.
   * Upserts member and parents by email (additive flags). Creates person_relationships between
   * each present parent and the member. Optionally provisions Auth0 accounts for never-logged-in people.
   */
  async memberFamilyImportFromFile(
    buffer: Buffer,
    sendInvites: boolean,
  ): Promise<MemberFamilyImportResponseDto> {
    const { rows, skips } = parseMemberFamilyImportBuffer(buffer)

    let membersAdded = 0
    let membersUpdated = 0
    let parentsAdded = 0
    let parentsUpdated = 0
    let relationshipsCreated = 0
    let invitesSent = 0
    const allSkips = [...skips]
    const allWarnings: string[] = []

    if (rows.length === 0) {
      return {
        membersAdded,
        membersUpdated,
        parentsAdded,
        parentsUpdated,
        relationshipsCreated,
        invitesSent,
        skippedCount: allSkips.length,
        skipped: allSkips,
        warnings: allWarnings,
      }
    }

    // Collect all emails to prefetch existing people
    const memberEmails = rows.map((r) => r.member.email)
    const parentEmails = rows.flatMap(
      (r) => [r.mom?.email, r.dad?.email].filter(Boolean) as string[],
    )
    const allEmails = [...new Set([...memberEmails, ...parentEmails])]

    const existing = await this.personModel.findAll({
      where: { personalEmail: { [Op.in]: allEmails } },
      paranoid: false,
    })
    const emailToPerson = new Map<string, Person>()
    for (const p of existing) {
      emailToPerson.set(p.personalEmail, p)
    }

    const sequelize = this.personModel.sequelize
    if (!sequelize) throw new BadRequestException('Database unavailable')

    // People to potentially invite after transaction completes
    const toInvite: Person[] = []

    await sequelize.transaction(async (transaction) => {
      for (const row of rows) {
        // Accumulate parent warnings for this row
        for (const w of row.parentWarnings) {
          allWarnings.push(`Row ${row.sourceRow}: ${w}`)
        }

        // --- Upsert member ---
        let memberPerson: Person
        try {
          const existing = emailToPerson.get(row.member.email)
          if (existing) {
            if (existing.deletedAt) await existing.restore({ transaction })
            this.applyFamilyMemberPayload(existing, row.member)
            await existing.save({ transaction })
            memberPerson = existing
            membersUpdated++
          } else {
            memberPerson = await this.personModel.create(
              {
                firstName: row.member.firstName,
                lastName: row.member.lastName,
                personalEmail: row.member.email,
                mobilePhone: normalizeUsPhoneForStorage(row.member.phone),
                addressLine1: row.member.addressLine1,
                city: row.member.city,
                state: row.member.state,
                zip: row.member.zip,
                pledgeClassYear: row.member.pledgeClassYear,
                linkedinProfileUrl: row.member.linkedinProfileUrl,
                isMember: true,
                isParent: false,
              },
              { transaction },
            )
            emailToPerson.set(row.member.email, memberPerson)
            membersAdded++
          }
        } catch (err) {
          this.logger.warn('Family import: member row error', {
            sourceRow: row.sourceRow,
            email: row.member.email,
            error: err instanceof Error ? err.message : String(err),
          })
          allSkips.push({
            sourceRow: row.sourceRow,
            firstName: row.member.firstName,
            lastName: row.member.lastName,
            email: row.member.email,
            reason: 'Database error saving member — row skipped',
          })
          continue
        }

        if (sendInvites) toInvite.push(memberPerson)

        // --- Upsert each parent and create relationship ---
        const parentsToLink: Array<{ payload: FamilyImportPersonPayload; label: string }> = []
        if (row.mom) parentsToLink.push({ payload: row.mom, label: 'mom' })
        if (row.dad) parentsToLink.push({ payload: row.dad, label: 'dad' })

        for (const { payload: p } of parentsToLink) {
          let parentPerson: Person
          try {
            const existingParent = emailToPerson.get(p.email)
            if (existingParent) {
              if (existingParent.deletedAt) await existingParent.restore({ transaction })
              this.applyFamilyParentPayload(existingParent, p)
              await existingParent.save({ transaction })
              parentPerson = existingParent
              parentsUpdated++
            } else {
              parentPerson = await this.personModel.create(
                {
                  firstName: p.firstName,
                  lastName: p.lastName,
                  personalEmail: p.email,
                  mobilePhone: normalizeUsPhoneForStorage(p.phone),
                  addressLine1: p.addressLine1,
                  city: p.city,
                  state: p.state,
                  zip: p.zip,
                  isMember: false,
                  isParent: true,
                },
                { transaction },
              )
              emailToPerson.set(p.email, parentPerson)
              parentsAdded++
            }
          } catch (err) {
            this.logger.warn('Family import: parent upsert error', {
              sourceRow: row.sourceRow,
              parentEmail: p.email,
              error: err instanceof Error ? err.message : String(err),
            })
            allWarnings.push(
              `Row ${row.sourceRow}: parent ${p.firstName} ${p.lastName} (${p.email}) could not be saved — skipped`,
            )
            continue
          }

          if (sendInvites) toInvite.push(parentPerson)

          // Create relationship if it doesn't already exist
          try {
            const existingRel = await this.personRelationshipModel.findOne({
              where: {
                fromPersonId: parentPerson.id,
                toPersonId: memberPerson.id,
              },
              paranoid: false,
              transaction,
            })
            if (existingRel) {
              if (existingRel.deletedAt) {
                await existingRel.restore({ transaction })
                relationshipsCreated++
              }
            } else {
              await this.personRelationshipModel.create(
                {
                  fromPersonId: parentPerson.id,
                  toPersonId: memberPerson.id,
                  relationshipType: 'parent',
                },
                { transaction },
              )
              relationshipsCreated++
            }
          } catch (err) {
            this.logger.warn('Family import: relationship create error', {
              sourceRow: row.sourceRow,
              parentId: parentPerson.id,
              memberId: memberPerson.id,
              error: err instanceof Error ? err.message : String(err),
            })
            allWarnings.push(
              `Row ${row.sourceRow}: relationship for ${p.firstName} ${p.lastName} could not be created`,
            )
          }
        }
      }
    })

    // Send invites outside the transaction (Auth0 calls are external)
    if (sendInvites && toInvite.length > 0) {
      for (const person of toInvite) {
        try {
          const sent = await this.invitePersonIfEligible(person)
          if (sent) invitesSent++
        } catch (err) {
          this.logger.warn('Family import: invite failed', {
            personId: person.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    this.logger.info('Member family import completed', {
      membersAdded,
      membersUpdated,
      parentsAdded,
      parentsUpdated,
      relationshipsCreated,
      invitesSent,
      skipped: allSkips.length,
      warnings: allWarnings.length,
    })

    // Refresh the people index once after the bulk import (per-record hooks are
    // bypassed here). Relationships changed too, so a full people reindex keeps
    // family/legacy chunks accurate. Fire-and-forget; nightly backstop covers failures.
    if (membersAdded + membersUpdated + parentsAdded + parentsUpdated + relationshipsCreated > 0) {
      void this.indexingService.indexPeople()
    }

    return {
      membersAdded,
      membersUpdated,
      parentsAdded,
      parentsUpdated,
      relationshipsCreated,
      invitesSent,
      skippedCount: allSkips.length,
      skipped: allSkips,
      warnings: allWarnings,
    }
  }

  private applyFamilyMemberPayload(person: Person, m: FamilyImportMemberPayload): void {
    person.firstName = m.firstName
    person.lastName = m.lastName
    if (m.phone !== null) person.mobilePhone = normalizeUsPhoneForStorage(m.phone)
    if (m.addressLine1 !== null) person.addressLine1 = m.addressLine1
    if (m.city !== null) person.city = m.city
    if (m.state !== null) person.state = m.state
    if (m.zip !== null) person.zip = m.zip
    if (m.linkedinProfileUrl !== null) person.linkedinProfileUrl = m.linkedinProfileUrl
    person.pledgeClassYear = m.pledgeClassYear
    person.isMember = true
  }

  private applyFamilyParentPayload(person: Person, p: FamilyImportPersonPayload): void {
    person.firstName = p.firstName
    person.lastName = p.lastName
    if (p.phone !== null) person.mobilePhone = normalizeUsPhoneForStorage(p.phone)
    if (p.addressLine1 !== null) person.addressLine1 = p.addressLine1
    if (p.city !== null) person.city = p.city
    if (p.state !== null) person.state = p.state
    if (p.zip !== null) person.zip = p.zip
    person.isParent = true
  }

  /**
   * Provision an Auth0 account (and send invite) for a directory person if they have
   * never successfully logged in (login_count === 0 or no user record exists).
   * Returns true if an invite was sent.
   */
  private async invitePersonIfEligible(person: Person): Promise<boolean> {
    const email = person.personalEmail.trim().toLowerCase()

    const existingUser = await this.userModel.findOne({
      where: { email },
      paranoid: false,
    })

    if (existingUser) {
      // Already logged in — skip
      if ((existingUser.loginCount ?? 0) > 0) return false
      // Already provisioned in Auth0 — skip (avoid duplicate accounts)
      if (existingUser.auth0Id) return false
      // User exists, never provisioned, never logged in — provision now
      if (existingUser.deletedAt) await existingUser.restore()
      existingUser.personId = existingUser.personId ?? person.id
      await existingUser.save()
      const auth0Id = await this.auth0.provisionUser(email, person.firstName, person.lastName)
      if (auth0Id) {
        existingUser.auth0Id = auth0Id
        await existingUser.save()
      }
      return true
    }

    // No user account — create one and provision
    const user = await this.userModel.create({
      email,
      firstName: person.firstName,
      lastName: person.lastName,
      role: UserRole.VIEWER,
      personId: person.id,
      auth0Id: null,
    })
    const auth0Id = await this.auth0.provisionUser(email, person.firstName, person.lastName)
    if (auth0Id) {
      user.auth0Id = auth0Id
      await user.save()
    }
    return true
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
        where: { personalEmail: { [Op.in]: emails } },
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
      emailToPerson.set(p.personalEmail, p)
      if (p.externalContactId) contactToPerson.set(p.externalContactId, p)
    }

    let processed = 0
    const sequelize = this.personModel.sequelize
    if (!sequelize) {
      throw new BadRequestException('Database unavailable')
    }

    await sequelize.transaction(async (transaction) => {
      for (const c of creates) {
        const person = contactToPerson.get(c.externalContactId)

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
          if (person.personalEmail !== c.email) {
            emailToPerson.delete(person.personalEmail)
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
            personalEmail: c.email,
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

    // Bulk imports bypass the per-record index hooks, so refresh the whole
    // people source once (fire-and-forget; the nightly backstop covers failures).
    if (processed > 0) {
      void this.indexingService.indexPeople()
    }

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
