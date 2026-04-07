import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op, Transaction, UniqueConstraintError } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { ExecPosition } from '../database/entities/exec-position.entity'
import { ExecTerm } from '../database/entities/exec-term.entity'
import { ExecAssignment } from '../database/entities/exec-assignment.entity'
import { Person } from '../database/entities/person.entity'
import { StorageService } from '../storage/storage.service'
import { CreateExecTermDto } from './dto/create-exec-term.dto'
import { UpdateExecTermDto } from './dto/update-exec-term.dto'
import { ReplaceExecRosterDto } from './dto/replace-exec-roster.dto'
import { ExecPositionPublicDto } from './dto/exec-position-public.dto'
import { ExecTermPublicDto } from './dto/exec-term-public.dto'
import { ExecRosterResponseDto } from './dto/exec-roster-response.dto'
import { ExecRosterSlotDto } from './dto/exec-roster-slot.dto'
import { ExecRosterPersonDto } from './dto/exec-roster-person.dto'
import { PersonExecHistoryEntryDto } from './dto/person-exec-history-entry.dto'
import { ClaimMyExecAssignmentDto } from './dto/claim-my-exec-assignment.dto'
import { ReleaseMyExecAssignmentDto } from './dto/release-my-exec-assignment.dto'
import { execRoleEmailForPositionCode } from './exec-position-role-emails'
import type { ExecSeason } from '../database/entities/exec-term.entity'

/** Signed URL TTL for roster headshots (embedded in public HTML). */
const HEADSHOT_URL_EXPIRY_MINUTES = 7 * 24 * 60

@Injectable()
export class ExecTeamService {
  constructor(
    @InjectModel(ExecPosition)
    private execPositionModel: typeof ExecPosition,
    @InjectModel(ExecTerm)
    private execTermModel: typeof ExecTerm,
    @InjectModel(ExecAssignment)
    private execAssignmentModel: typeof ExecAssignment,
    @InjectModel(Person)
    private personModel: typeof Person,
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExecTeamService.name)
  }

  private toPositionDto(p: ExecPosition): ExecPositionPublicDto {
    return {
      id: p.id,
      code: p.code,
      displayName: p.displayName,
      sortOrder: p.sortOrder,
    }
  }

  private toTermDto(t: ExecTerm): ExecTermPublicDto {
    return {
      id: t.id,
      year: t.year,
      season: t.season,
      label: t.label ?? null,
      isCurrent: t.isCurrent,
    }
  }

  async findAllPositions(): Promise<ExecPositionPublicDto[]> {
    const rows = await this.execPositionModel.findAll({
      order: [['sortOrder', 'ASC']],
    })
    return rows.map((p) => this.toPositionDto(p))
  }

  async findAllTerms(): Promise<ExecTermPublicDto[]> {
    const rows = await this.execTermModel.findAll({
      order: [
        ['year', 'DESC'],
        ['season', 'DESC'],
      ],
    })
    return rows.map((t) => this.toTermDto(t))
  }

  async resolveDisplayTerm(termId?: string): Promise<ExecTerm | null> {
    if (termId) {
      return this.execTermModel.findByPk(termId)
    }
    const current = await this.execTermModel.findOne({ where: { isCurrent: true } })
    if (current) return current
    return this.execTermModel.findOne({
      order: [
        ['year', 'DESC'],
        ['season', 'DESC'],
      ],
    })
  }

  private async headshotUrlForPerson(person: Person | null | undefined): Promise<string | null> {
    if (!person?.execRosterHeadshotFilePath) return null
    try {
      return await this.storageService.getSignedUrl(
        person.execRosterHeadshotFilePath,
        HEADSHOT_URL_EXPIRY_MINUTES,
      )
    } catch (e) {
      this.logger.warn('Headshot signed URL failed', { personId: person.id, error: e })
      return null
    }
  }

  async getRoster(termId?: string): Promise<ExecRosterResponseDto> {
    const term = await this.resolveDisplayTerm(termId)
    const positions = await this.execPositionModel.findAll({
      order: [['sortOrder', 'ASC']],
    })

    if (!term) {
      return {
        term: null,
        slots: positions.map((pos) => ({
          position: this.toPositionDto(pos),
          person: null,
        })),
      }
    }

    const assignments = await this.execAssignmentModel.findAll({
      where: { execTermId: term.id },
      include: [{ model: Person, required: false }],
    })
    const byPositionId = new Map(assignments.map((a) => [a.execPositionId, a]))

    const slots: ExecRosterSlotDto[] = []
    for (const pos of positions) {
      const a = byPositionId.get(pos.id)
      let personDto: ExecRosterPersonDto | null = null
      if (a?.person) {
        const p = a.person
        const roleEmail = execRoleEmailForPositionCode(pos.code)
        personDto = {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: term.isCurrent ? (roleEmail ?? p.email) : null,
          phone: term.isCurrent ? (p.mobilePhone ?? null) : null,
          headshotUrl: await this.headshotUrlForPerson(p),
        }
      }
      slots.push({
        position: this.toPositionDto(pos),
        person: personDto,
      })
    }

    return {
      term: this.toTermDto(term),
      slots,
    }
  }

  async getRosterForTerm(termId: string): Promise<ExecRosterResponseDto> {
    const term = await this.execTermModel.findByPk(termId)
    if (!term) {
      throw new NotFoundException('Term not found')
    }
    return this.getRoster(termId)
  }

  /**
   * All exec assignments for this person (any term), newest term first.
   */
  async findExecHistoryForPerson(personId: string): Promise<PersonExecHistoryEntryDto[]> {
    const rows = await this.execAssignmentModel.findAll({
      where: { personId },
      include: [
        { model: this.execTermModel, required: true },
        { model: this.execPositionModel, required: true },
      ],
    })

    rows.sort((a, b) => {
      const ta = a.execTerm!
      const tb = b.execTerm!
      if (tb.year !== ta.year) return tb.year - ta.year
      const bySeason = tb.season.localeCompare(ta.season)
      if (bySeason !== 0) return bySeason
      return (a.execPosition!.sortOrder ?? 0) - (b.execPosition!.sortOrder ?? 0)
    })

    return rows.map((a) => ({
      term: this.toTermDto(a.execTerm!),
      position: this.toPositionDto(a.execPosition!),
    }))
  }

  async createTerm(dto: CreateExecTermDto): Promise<ExecTermPublicDto> {
    const existing = await this.execTermModel.findOne({
      where: { year: dto.year, season: dto.season },
    })
    if (existing) {
      throw new ConflictException(`A term already exists for ${dto.season} ${dto.year}`)
    }

    if (dto.isCurrent) {
      await this.execTermModel.update({ isCurrent: false }, { where: {} })
    }

    const term = await this.execTermModel.create({
      year: dto.year,
      season: dto.season,
      label: dto.label?.trim() || null,
      isCurrent: !!dto.isCurrent,
    })
    this.logger.info('Created exec term', { id: term.id })
    return this.toTermDto(term)
  }

  async updateTerm(id: string, dto: UpdateExecTermDto): Promise<ExecTermPublicDto> {
    const term = await this.execTermModel.findByPk(id)
    if (!term) {
      throw new NotFoundException('Term not found')
    }

    if (dto.label !== undefined) {
      term.label = dto.label === null || dto.label === '' ? null : dto.label.trim()
    }
    if (dto.isCurrent === true) {
      await this.execTermModel.update({ isCurrent: false }, { where: { id: { [Op.ne]: id } } })
      term.isCurrent = true
    } else if (dto.isCurrent === false) {
      term.isCurrent = false
    }

    await term.save()
    return this.toTermDto(term)
  }

  async deleteTerm(id: string): Promise<void> {
    const term = await this.execTermModel.findByPk(id)
    if (!term) {
      throw new NotFoundException('Term not found')
    }
    await this.execAssignmentModel.destroy({ where: { execTermId: id } })
    await term.destroy()
    this.logger.info('Deleted exec term', { id })
  }

  async replaceRoster(termId: string, dto: ReplaceExecRosterDto): Promise<ExecRosterResponseDto> {
    const term = await this.execTermModel.findByPk(termId)
    if (!term) {
      throw new NotFoundException('Term not found')
    }

    const positionIds = new Set(
      (await this.execPositionModel.findAll({ attributes: ['id'] })).map((p) => p.id),
    )
    const seenPositions = new Set<string>()

    for (const row of dto.assignments) {
      if (!positionIds.has(row.positionId)) {
        throw new BadRequestException(`Unknown position id: ${row.positionId}`)
      }
      if (seenPositions.has(row.positionId)) {
        throw new BadRequestException(`Duplicate position in payload: ${row.positionId}`)
      }
      seenPositions.add(row.positionId)
    }

    const memberIds = dto.assignments
      .map((row) => row.personId)
      .filter((pid): pid is string => pid != null && pid !== '')
    const uniqueMembers = [...new Set(memberIds)]

    if (uniqueMembers.length > 0) {
      const people = await this.personModel.findAll({
        where: { id: { [Op.in]: uniqueMembers } },
      })
      if (people.length !== uniqueMembers.length) {
        throw new BadRequestException('One or more selected people were not found')
      }
      for (const p of people) {
        if (!p.isMember) {
          throw new BadRequestException(`Person ${p.id} is not a chapter member`)
        }
      }
    }

    await this.execTermModel.sequelize!.transaction(async (transaction) => {
      await this.execAssignmentModel.destroy({ where: { execTermId: termId }, transaction })
      for (const row of dto.assignments) {
        const personId =
          row.personId === undefined || row.personId === null || row.personId === ''
            ? null
            : row.personId
        await this.execAssignmentModel.create(
          {
            execTermId: termId,
            execPositionId: row.positionId,
            personId,
          },
          { transaction },
        )
      }
    })

    this.logger.info('Replaced exec roster', { termId })
    return this.getRosterForTerm(termId)
  }

  /**
   * Creates a Fall/Spring term if missing. Never sets isCurrent (admin-only).
   * Handles concurrent creates via unique (year, season).
   */
  private async findOrCreateTermForSelfAssignment(
    year: number,
    season: ExecSeason,
    transaction: Transaction,
  ): Promise<ExecTerm> {
    let term = await this.execTermModel.findOne({
      where: { year, season },
      transaction,
    })
    if (term) return term

    const label = `${season === 'fall' ? 'Fall' : 'Spring'} ${year}`
    try {
      term = await this.execTermModel.create(
        { year, season, label, isCurrent: false },
        { transaction },
      )
      return term
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        const again = await this.execTermModel.findOne({
          where: { year, season },
          transaction,
        })
        if (again) return again
      }
      throw e
    }
  }

  /**
   * Linked member assigns themselves to one roster slot (creates term if needed). Does not replace the full roster.
   */
  async claimMyExecAssignment(
    personId: string,
    dto: ClaimMyExecAssignmentDto,
  ): Promise<PersonExecHistoryEntryDto> {
    const person = await this.personModel.findByPk(personId)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    if (!person.isMember) {
      throw new ForbiddenException(
        'Only chapter members can add executive offices to their profile.',
      )
    }

    const position = await this.execPositionModel.findByPk(dto.positionId)
    if (!position) {
      throw new BadRequestException('Unknown executive position')
    }

    return this.execTermModel.sequelize!.transaction(async (transaction) => {
      const term = await this.findOrCreateTermForSelfAssignment(
        dto.year,
        dto.season,
        transaction,
      )

      let assignment = await this.execAssignmentModel.findOne({
        where: { execTermId: term.id, execPositionId: dto.positionId },
        transaction,
      })

      if (!assignment) {
        assignment = await this.execAssignmentModel.create(
          {
            execTermId: term.id,
            execPositionId: dto.positionId,
            personId,
          },
          { transaction },
        )
      } else if (assignment.personId === personId) {
        // idempotent
      } else if (assignment.personId) {
        const other = await this.personModel.findByPk(assignment.personId, { transaction })
        const name = other ? `${other.firstName} ${other.lastName}`.trim() : 'another member'
        throw new ConflictException(
          `That executive office for this term is already assigned to ${name}. ` +
            `Contact an administrator if the roster should be updated.`,
        )
      } else {
        assignment.personId = personId
        await assignment.save({ transaction })
      }

      this.logger.info('Member claimed exec assignment', {
        personId,
        termId: term.id,
        positionId: dto.positionId,
      })

      return {
        term: this.toTermDto(term),
        position: this.toPositionDto(position),
      }
    })
  }

  /**
   * Linked member clears one roster slot they hold (sparse row removed).
   */
  async releaseMyExecAssignment(
    personId: string,
    dto: ReleaseMyExecAssignmentDto,
  ): Promise<void> {
    const person = await this.personModel.findByPk(personId)
    if (!person) {
      throw new NotFoundException('Person not found')
    }
    if (!person.isMember) {
      throw new ForbiddenException(
        'Only chapter members can update executive offices on their profile.',
      )
    }

    const term = await this.execTermModel.findOne({
      where: { year: dto.year, season: dto.season },
    })
    if (!term) {
      throw new NotFoundException('No executive term matches that year and season')
    }

    const assignment = await this.execAssignmentModel.findOne({
      where: { execTermId: term.id, execPositionId: dto.positionId },
    })
    if (!assignment) {
      throw new NotFoundException('You are not listed for that office in that term')
    }
    if (assignment.personId !== personId) {
      throw new ForbiddenException('You can only remove executive offices from your own profile')
    }

    await assignment.destroy()
    this.logger.info('Member released exec assignment', {
      personId,
      termId: term.id,
      positionId: dto.positionId,
    })
  }
}
