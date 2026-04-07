import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Op, UniqueConstraintError } from 'sequelize'
import { Person } from '../database/entities/person.entity'
import { User, UserRole } from '../database/entities/user.entity'
import { PersonRelationship } from '../database/entities/person-relationship.entity'
import { isAllowedRelationshipType } from './constants/relationship-types'
import {
  CreatePersonRelationshipDto,
  PersonRelationshipConnectDirectionDto,
} from './dto/create-person-relationship.dto'
import { UpdatePersonRelationshipDto } from './dto/update-person-relationship.dto'
import {
  PersonRelationshipCounterpartDto,
  PersonRelationshipResponseDto,
} from './dto/person-relationship-response.dto'
import {
  computeConnectionTags,
  viewerCounterpartRoleLabel,
} from './relationship-connection-display'

@Injectable()
export class PersonRelationshipsService {
  constructor(
    @InjectModel(PersonRelationship)
    private readonly relationshipModel: typeof PersonRelationship,
    @InjectModel(Person)
    private readonly personModel: typeof Person,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PersonRelationshipsService.name)
  }

  /** Site admins, or the directory person when `users.personId` matches `personId`. */
  private assertCanManageRelationshipsForPerson(personId: string, viewer: User): void {
    const isAdmin = viewer.role === UserRole.ADMIN
    const self = viewer.personId != null && viewer.personId === personId
    if (!isAdmin && !self) {
      throw new ForbiddenException(
        'You can only manage connections for your own profile unless you are a site administrator.',
      )
    }
  }

  private viewerIsAdmin(viewer: User | undefined): boolean {
    return viewer?.role === UserRole.ADMIN
  }

  private isSelfView(viewer: User | undefined, person: Person): boolean {
    if (!viewer) return false
    if (viewer.personId && viewer.personId === person.id) return true
    return viewer.email.trim().toLowerCase() === person.email.trim().toLowerCase()
  }

  private counterpartDto(person: Person, viewer?: User): PersonRelationshipCounterpartDto {
    const hasEmailOnFile = !!person.email?.trim()
    let email: string | null = person.email
    if (!this.viewerIsAdmin(viewer)) {
      if (!viewer) {
        email = null
      } else if (!this.isSelfView(viewer, person) && !person.shareEmailWithLoggedInMembers) {
        email = null
      }
    }
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email,
      hasEmailOnFile,
      isMember: person.isMember,
      isParent: person.isParent,
      removedFromDirectory: person.deletedAt != null,
      pledgeClassYear: person.pledgeClassYear ?? null,
    }
  }

  private toResponseDto(
    rel: PersonRelationship,
    viewerId: string,
    viewer?: User,
  ): PersonRelationshipResponseDto {
    const viewerIsFrom = rel.fromPersonId === viewerId
    const viewerPerson = viewerIsFrom ? rel.fromPerson : rel.toPerson
    const counterpartPerson = viewerIsFrom ? rel.toPerson : rel.fromPerson
    const connectionTags = computeConnectionTags(
      viewerPerson.isMember,
      counterpartPerson.isMember,
      rel.relationshipType,
    )
    return {
      id: rel.id,
      fromPersonId: rel.fromPersonId,
      toPersonId: rel.toPersonId,
      counterpart: this.counterpartDto(counterpartPerson, viewer),
      relationshipType: rel.relationshipType ?? null,
      notes: rel.notes ?? null,
      viewerIsFrom,
      viewerCounterpartRoleLabel: viewerCounterpartRoleLabel(rel.relationshipType, viewerIsFrom),
      connectionTags,
      createdAt: rel.createdAt,
      updatedAt: rel.updatedAt,
    }
  }

  private normalizeOptionalType(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value === '') return null
    if (!isAllowedRelationshipType(value)) {
      throw new BadRequestException(`Invalid relationshipType: ${value}`)
    }
    return value
  }

  async findAllForPerson(
    personId: string,
    viewer?: User,
  ): Promise<PersonRelationshipResponseDto[]> {
    await this.requireActivePerson(personId)

    const rows = await this.relationshipModel.findAll({
      where: {
        [Op.or]: [{ fromPersonId: personId }, { toPersonId: personId }],
      },
      include: [
        { model: Person, as: 'fromPerson', paranoid: false },
        { model: Person, as: 'toPerson', paranoid: false },
      ],
      order: [['createdAt', 'ASC']],
    })

    return rows.map((r) => this.toResponseDto(r, personId, viewer))
  }

  private async requireActivePerson(id: string): Promise<Person> {
    const person = await this.personModel.findByPk(id)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    return person
  }

  private async loadRelationshipForPerson(
    personId: string,
    relationshipId: string,
  ): Promise<PersonRelationship> {
    await this.requireActivePerson(personId)

    const rel = await this.relationshipModel.findOne({
      where: {
        id: relationshipId,
        [Op.or]: [{ fromPersonId: personId }, { toPersonId: personId }],
      },
      include: [
        { model: Person, as: 'fromPerson', paranoid: false },
        { model: Person, as: 'toPerson', paranoid: false },
      ],
    })

    if (!rel) {
      throw new NotFoundException('Relationship not found')
    }
    return rel
  }

  async create(
    personId: string,
    dto: CreatePersonRelationshipDto,
    viewer: User,
  ): Promise<PersonRelationshipResponseDto> {
    if (dto.otherPersonId === personId) {
      throw new BadRequestException('Cannot relate a person to themselves')
    }

    this.assertCanManageRelationshipsForPerson(personId, viewer)

    await this.requireActivePerson(personId)
    await this.requireActivePerson(dto.otherPersonId)

    const relationshipType = this.normalizeOptionalType(dto.relationshipType)

    let fromPersonId: string
    let toPersonId: string
    if (dto.direction === PersonRelationshipConnectDirectionDto.OTHER_IS_FROM) {
      fromPersonId = dto.otherPersonId
      toPersonId = personId
    } else {
      fromPersonId = personId
      toPersonId = dto.otherPersonId
    }

    const notes = dto.notes?.trim() ? dto.notes.trim() : null

    try {
      const rel = await this.relationshipModel.create({
        fromPersonId,
        toPersonId,
        relationshipType,
        notes,
      })

      const withIncludes = await this.relationshipModel.findByPk(rel.id, {
        include: [
          { model: Person, as: 'fromPerson', paranoid: false },
          { model: Person, as: 'toPerson', paranoid: false },
        ],
      })

      this.logger.info('Created person relationship', {
        id: rel.id,
        fromPersonId,
        toPersonId,
      })

      return this.toResponseDto(withIncludes!, personId, viewer)
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new ConflictException(
          'A legacy link already exists between these two people in this direction',
        )
      }
      throw err
    }
  }

  async update(
    personId: string,
    relationshipId: string,
    dto: UpdatePersonRelationshipDto,
    viewer: User,
  ): Promise<PersonRelationshipResponseDto> {
    if (dto.relationshipType === undefined && dto.notes === undefined) {
      throw new BadRequestException('No fields to update')
    }

    this.assertCanManageRelationshipsForPerson(personId, viewer)

    const rel = await this.loadRelationshipForPerson(personId, relationshipId)

    if (dto.relationshipType !== undefined) {
      rel.relationshipType = this.normalizeOptionalType(dto.relationshipType)
    }
    if (dto.notes !== undefined) {
      rel.notes = dto.notes === null || dto.notes === '' ? null : String(dto.notes).trim() || null
    }

    await rel.save()
    this.logger.info('Updated person relationship', { id: rel.id })

    const reloaded = await this.relationshipModel.findByPk(rel.id, {
      include: [
        { model: Person, as: 'fromPerson', paranoid: false },
        { model: Person, as: 'toPerson', paranoid: false },
      ],
    })

    return this.toResponseDto(reloaded!, personId, viewer)
  }

  async remove(personId: string, relationshipId: string, viewer: User): Promise<void> {
    this.assertCanManageRelationshipsForPerson(personId, viewer)
    const rel = await this.loadRelationshipForPerson(personId, relationshipId)
    await rel.destroy()
    this.logger.info('Soft-deleted person relationship', { id: relationshipId })
  }
}
