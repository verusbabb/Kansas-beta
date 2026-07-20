import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { PinoLogger } from 'nestjs-pino'
import { RushProspect } from '../database/entities/rush-prospect.entity'
import { RushProspectActivity } from '../database/entities/rush-prospect-activity.entity'
import { RushEvent } from '../database/entities/rush-event.entity'
import { Person } from '../database/entities/person.entity'
import { User } from '../database/entities/user.entity'
import { SendGridService } from '../sendgrid/sendgrid.service'
import { CreateRushProspectDto } from './dto/create-rush-prospect.dto'
import { UpdateRushProspectDto } from './dto/update-rush-prospect.dto'
import { CreateRushProspectActivityDto } from './dto/create-rush-prospect-activity.dto'
import { RushProspectSummaryDto } from './dto/rush-prospect-summary.dto'
import {
  RushProspectResponseDto,
  MemberLegacySearchResultDto,
} from './dto/rush-prospect-response.dto'
import { RushProspectActivityResponseDto } from './dto/rush-prospect-activity-response.dto'

@Injectable()
export class RushProspectsService {
  constructor(
    @InjectModel(RushProspect) private prospectModel: typeof RushProspect,
    @InjectModel(RushProspectActivity) private activityModel: typeof RushProspectActivity,
    @InjectModel(Person) private personModel: typeof Person,
    @InjectModel(User) private userModel: typeof User,
    private readonly sendGridService: SendGridService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushProspectsService.name)
  }

  // ── Public: submit application ───────────────────────────────────────────

  async submitApplication(dto: CreateRushProspectDto): Promise<RushProspectSummaryDto> {
    const rushYear = new Date().getFullYear()
    const email = dto.email.trim().toLowerCase()

    const [prospect, created] = await this.prospectModel.findOrCreate({
      where: { email, rushYear },
      defaults: {
        rushYear,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone: dto.phone?.trim() ?? null,
        hometown: dto.hometown?.trim() ?? null,
        highSchool: dto.highSchool?.trim() ?? null,
        classYear: dto.classYear ?? null,
        enrollmentSemester: dto.enrollmentSemester ?? null,
        enrollmentYear: dto.enrollmentYear ?? null,
        major: dto.major?.trim() ?? null,
        gpa: dto.gpa ?? null,
        actScore: dto.actScore ?? null,
        satScore: dto.satScore ?? null,
        sportsActivities: dto.sportsActivities?.trim() ?? null,
        honorsAwards: dto.honorsAwards?.trim() ?? null,
        legacyRelativePersonId: dto.legacyRelativePersonId ?? null,
        legacyRelativeName: dto.legacyRelativeName?.trim() ?? null,
        legacyRelationship: dto.legacyRelationship ?? null,
        referralSource: dto.referralSource?.trim() ?? null,
        pipelineStage: 'inquiry',
        applicationSubmittedAt: new Date(),
      },
      paranoid: false,
    })

    if (prospect.deletedAt) {
      await prospect.restore()
    }

    if (!created) {
      // Resubmission — update fields with new data
      await prospect.update({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() ?? prospect.phone,
        hometown: dto.hometown?.trim() ?? prospect.hometown,
        highSchool: dto.highSchool?.trim() ?? prospect.highSchool,
        classYear: dto.classYear ?? prospect.classYear,
        enrollmentSemester: dto.enrollmentSemester ?? prospect.enrollmentSemester,
        enrollmentYear: dto.enrollmentYear ?? prospect.enrollmentYear,
        major: dto.major?.trim() ?? prospect.major,
        gpa: dto.gpa ?? prospect.gpa,
        actScore: dto.actScore ?? prospect.actScore,
        satScore: dto.satScore ?? prospect.satScore,
        sportsActivities: dto.sportsActivities?.trim() ?? prospect.sportsActivities,
        honorsAwards: dto.honorsAwards?.trim() ?? prospect.honorsAwards,
        legacyRelativePersonId: dto.legacyRelativePersonId ?? prospect.legacyRelativePersonId,
        legacyRelativeName: dto.legacyRelativeName?.trim() ?? prospect.legacyRelativeName,
        legacyRelationship: dto.legacyRelationship ?? prospect.legacyRelationship,
        referralSource: dto.referralSource?.trim() ?? prospect.referralSource,
        applicationSubmittedAt: new Date(),
      })
    }

    if (created) {
      await this.activityModel.create({
        prospectId: prospect.id,
        activityType: 'application_received',
        note: null,
        createdByUserId: null,
      })
    }

    // Send rush confirmation email (doesn't block — failures are logged but don't error)
    await this.sendGridService.sendRushConfirmation({
      to: prospect.email,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
    })

    this.logger.info({ prospectId: prospect.id, created }, 'Rush application submitted')
    return this.toSummaryDto(prospect)
  }

  // ── Public: member legacy search ─────────────────────────────────────────

  async legacySearch(q: string): Promise<MemberLegacySearchResultDto[]> {
    if (!q || q.trim().length < 2) return []

    const term = q.trim()
    const people = await this.personModel.findAll({
      where: {
        isMember: true,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${term}%` } },
          { lastName: { [Op.iLike]: `%${term}%` } },
        ],
      },
      attributes: ['id', 'firstName', 'lastName'],
      limit: 10,
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    })

    return people.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName }))
  }

  // ── Admin: list prospects ────────────────────────────────────────────────

  async findAll(
    rushYear: number,
    stage?: string,
    search?: string,
  ): Promise<RushProspectSummaryDto[]> {
    const where: Record<string, unknown> = { rushYear }
    if (stage) where['pipelineStage'] = stage
    if (search) {
      const term = `%${search.trim()}%`
      where[Op.or as unknown as string] = [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
      ]
    }

    const prospects = await this.prospectModel.findAll({
      where,
      include: [
        {
          model: RushProspectActivity,
          as: 'activities',
          attributes: ['activityType', 'createdAt'],
          where: { activityType: 'stage_change' },
          required: false,
          separate: true,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
        {
          model: Person,
          as: 'assignedToPerson',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    return prospects.map((p) => this.toSummaryDto(p))
  }

  // ── Admin: get one prospect with full activity log ───────────────────────

  async findOne(id: string): Promise<RushProspectResponseDto> {
    const prospect = await this.prospectModel.findByPk(id, {
      include: [
        {
          model: RushProspectActivity,
          as: 'activities',
          include: [
            { model: RushEvent, as: 'rushEvent', attributes: ['id', 'title'], required: false },
            {
              model: User,
              as: 'createdBy',
              attributes: ['id', 'firstName', 'lastName'],
              required: false,
            },
          ],
          separate: true,
          order: [['createdAt', 'DESC']],
        },
        {
          model: Person,
          as: 'legacyRelativePerson',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
        {
          model: Person,
          as: 'assignedToPerson',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
    })

    if (!prospect) throw new NotFoundException(`Prospect ${id} not found`)

    return this.toResponseDto(prospect)
  }

  // ── Admin: update prospect ───────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateRushProspectDto,
    requestingUser: User,
  ): Promise<RushProspectResponseDto> {
    const prospect = await this.prospectModel.findByPk(id)
    if (!prospect) throw new NotFoundException(`Prospect ${id} not found`)

    const previousStage = prospect.pipelineStage

    await prospect.update({
      ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
      ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() }),
      ...(dto.phone !== undefined && { phone: dto.phone?.trim() ?? null }),
      ...(dto.hometown !== undefined && { hometown: dto.hometown?.trim() ?? null }),
      ...(dto.highSchool !== undefined && { highSchool: dto.highSchool?.trim() ?? null }),
      ...(dto.classYear !== undefined && { classYear: dto.classYear }),
      ...(dto.enrollmentSemester !== undefined && { enrollmentSemester: dto.enrollmentSemester }),
      ...(dto.enrollmentYear !== undefined && { enrollmentYear: dto.enrollmentYear }),
      ...(dto.major !== undefined && { major: dto.major?.trim() ?? null }),
      ...(dto.gpa !== undefined && { gpa: dto.gpa }),
      ...(dto.actScore !== undefined && { actScore: dto.actScore }),
      ...(dto.satScore !== undefined && { satScore: dto.satScore }),
      ...(dto.sportsActivities !== undefined && {
        sportsActivities: dto.sportsActivities?.trim() ?? null,
      }),
      ...(dto.honorsAwards !== undefined && { honorsAwards: dto.honorsAwards?.trim() ?? null }),
      ...(dto.legacyRelativePersonId !== undefined && {
        legacyRelativePersonId: dto.legacyRelativePersonId,
      }),
      ...(dto.legacyRelativeName !== undefined && {
        legacyRelativeName: dto.legacyRelativeName?.trim() ?? null,
      }),
      ...(dto.legacyRelationship !== undefined && { legacyRelationship: dto.legacyRelationship }),
      ...(dto.referralSource !== undefined && {
        referralSource: dto.referralSource?.trim() ?? null,
      }),
      ...(dto.pipelineStage !== undefined && { pipelineStage: dto.pipelineStage }),
      ...(dto.assignedToPersonId !== undefined && { assignedToPersonId: dto.assignedToPersonId }),
      ...(dto.internalRating !== undefined && { internalRating: dto.internalRating }),
    })

    // Auto-log stage change
    if (dto.pipelineStage && dto.pipelineStage !== previousStage) {
      await this.activityModel.create({
        prospectId: prospect.id,
        activityType: 'stage_change',
        fromStage: previousStage,
        toStage: dto.pipelineStage,
        createdByUserId: requestingUser.id,
      })
    }

    return this.findOne(id)
  }

  // ── Admin: add activity ──────────────────────────────────────────────────

  async addActivity(
    prospectId: string,
    dto: CreateRushProspectActivityDto,
    requestingUser: User,
  ): Promise<RushProspectActivityResponseDto> {
    const prospect = await this.prospectModel.findByPk(prospectId)
    if (!prospect) throw new NotFoundException(`Prospect ${prospectId} not found`)

    const activity = await this.activityModel.create({
      prospectId,
      activityType: dto.activityType,
      note: dto.note?.trim() ?? null,
      rushEventId: dto.rushEventId ?? null,
      createdByUserId: requestingUser.id,
    })

    // Load associations for response
    const loaded = await this.activityModel.findByPk(activity.id, {
      include: [
        { model: RushEvent, as: 'rushEvent', attributes: ['id', 'title'], required: false },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
    })

    return this.toActivityDto(loaded!)
  }

  // ── Admin: delete prospect ───────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    const prospect = await this.prospectModel.findByPk(id)
    if (!prospect) throw new NotFoundException(`Prospect ${id} not found`)
    await prospect.destroy()
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private toSummaryDto(p: RushProspect): RushProspectSummaryDto {
    const lastStageChange = (p.activities ?? []).find((a) => a.activityType === 'stage_change')
    const assignedPerson = p.assignedToPerson as
      (Person & { firstName: string; lastName: string }) | null
    return {
      id: p.id,
      rushYear: p.rushYear,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone ?? null,
      hometown: p.hometown ?? null,
      classYear: p.classYear ?? null,
      enrollmentSemester: p.enrollmentSemester ?? null,
      enrollmentYear: p.enrollmentYear ?? null,
      isLegacy: Boolean(p.legacyRelativePersonId || p.legacyRelativeName),
      pipelineStage: p.pipelineStage,
      internalRating: p.internalRating ?? null,
      assignedToPersonId: p.assignedToPersonId ?? null,
      assignedToPersonName: assignedPerson
        ? `${assignedPerson.firstName} ${assignedPerson.lastName}`
        : null,
      applicationSubmittedAt: p.applicationSubmittedAt?.toISOString() ?? null,
      lastStageChangedAt: lastStageChange?.createdAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }
  }

  private toResponseDto(p: RushProspect): RushProspectResponseDto {
    const legacyPerson = p.legacyRelativePerson as
      (Person & { firstName: string; lastName: string }) | null
    // assignedToPerson is already resolved in toSummaryDto via p.assignedToPerson
    return {
      ...this.toSummaryDto(p),
      hometown: p.hometown ?? null,
      highSchool: p.highSchool ?? null,
      major: p.major ?? null,
      gpa: p.gpa != null ? Number(p.gpa) : null,
      actScore: p.actScore ?? null,
      satScore: p.satScore ?? null,
      sportsActivities: p.sportsActivities ?? null,
      honorsAwards: p.honorsAwards ?? null,
      legacyRelativePersonId: p.legacyRelativePersonId ?? null,
      legacyRelativeName: p.legacyRelativeName ?? null,
      legacyRelationship: p.legacyRelationship ?? null,
      legacyRelativeFullName: legacyPerson
        ? `${legacyPerson.firstName} ${legacyPerson.lastName}`
        : null,
      referralSource: p.referralSource ?? null,
      activities: (p.activities ?? []).map((a) => this.toActivityDto(a)),
    }
  }

  private toActivityDto(a: RushProspectActivity): RushProspectActivityResponseDto {
    const rushEvent = a.rushEvent as ({ title: string } & RushEvent) | null
    const createdBy = a.createdBy as (User & { firstName: string; lastName: string }) | null
    return {
      id: a.id,
      prospectId: a.prospectId,
      activityType: a.activityType,
      note: a.note ?? null,
      fromStage: a.fromStage ?? null,
      toStage: a.toStage ?? null,
      rushEventId: a.rushEventId ?? null,
      rushEventTitle: rushEvent?.title ?? null,
      createdByUserId: a.createdByUserId ?? null,
      createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : null,
      createdAt: a.createdAt.toISOString(),
    }
  }
}
