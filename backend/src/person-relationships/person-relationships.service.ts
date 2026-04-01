import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { Op, UniqueConstraintError } from 'sequelize'
import { Person } from '../database/entities/person.entity'
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

  private counterpartDto(person: Person): PersonRelationshipCounterpartDto {
    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      isMember: person.isMember,
      isParent: person.isParent,
      removedFromDirectory: person.deletedAt != null,
      pledgeClassYear: person.pledgeClassYear ?? null,
    }
  }

  private toResponseDto(rel: PersonRelationship, viewerId: string): PersonRelationshipResponseDto {
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
      counterpart: this.counterpartDto(counterpartPerson),
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

  async findAllForPerson(personId: string): Promise<PersonRelationshipResponseDto[]> {
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

    return rows.map((r) => this.toResponseDto(r, personId))
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
  ): Promise<PersonRelationshipResponseDto> {
    if (dto.otherPersonId === personId) {
      throw new BadRequestException('Cannot relate a person to themselves')
    }

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

      return this.toResponseDto(withIncludes!, personId)
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
  ): Promise<PersonRelationshipResponseDto> {
    if (dto.relationshipType === undefined && dto.notes === undefined) {
      throw new BadRequestException('No fields to update')
    }

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

    return this.toResponseDto(reloaded!, personId)
  }

  async remove(personId: string, relationshipId: string): Promise<void> {
    const rel = await this.loadRelationshipForPerson(personId, relationshipId)
    await rel.destroy()
    this.logger.info('Soft-deleted person relationship', { id: relationshipId })
  }
}
