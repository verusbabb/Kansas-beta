import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { RushEvent } from '../database/entities/rush-event.entity'
import { CreateRushEventDto } from './dto/create-rush-event.dto'
import { UpdateRushEventDto } from './dto/update-rush-event.dto'
import { RushEventResponseDto } from './dto/rush-event-response.dto'

@Injectable()
export class RushEventsService {
  constructor(
    @InjectModel(RushEvent)
    private rushEventModel: typeof RushEvent,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushEventsService.name)
  }

  async create(dto: CreateRushEventDto): Promise<RushEventResponseDto> {
    try {
      const row = await this.rushEventModel.create({
        title: dto.title.trim(),
        displayDate: dto.displayDate.trim(),
        description: dto.description ?? null,
        icon: dto.icon?.trim() || 'pi pi-calendar',
        location: dto.location?.trim() || null,
        timeLabel: dto.timeLabel?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      })
      return this.toDto(row)
    } catch (error) {
      this.logger.error('Failed to create rush event', error)
      throw error
    }
  }

  /** Public rush page: ordered list */
  async findPublic(): Promise<RushEventResponseDto[]> {
    try {
      const rows = await this.rushEventModel.findAll({
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      })
      return rows.map((r) => this.toDto(r))
    } catch (error) {
      this.logger.error('Failed to fetch public rush events', error)
      throw error
    }
  }

  async findAll(): Promise<RushEventResponseDto[]> {
    try {
      const rows = await this.rushEventModel.findAll({
        order: [
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      })
      return rows.map((r) => this.toDto(r))
    } catch (error) {
      this.logger.error('Failed to fetch rush events', error)
      throw error
    }
  }

  async findOne(id: string): Promise<RushEventResponseDto> {
    const row = await this.rushEventModel.findByPk(id)
    if (!row) {
      throw new NotFoundException(`Rush event with ID ${id} not found`)
    }
    return this.toDto(row)
  }

  async update(id: string, dto: UpdateRushEventDto): Promise<RushEventResponseDto> {
    const row = await this.rushEventModel.findByPk(id)
    if (!row) {
      throw new NotFoundException(`Rush event with ID ${id} not found`)
    }

    await row.update({
      title: dto.title !== undefined ? dto.title.trim() : row.title,
      displayDate: dto.displayDate !== undefined ? dto.displayDate.trim() : row.displayDate,
      description: dto.description !== undefined ? (dto.description ?? null) : row.description,
      icon: dto.icon !== undefined ? dto.icon.trim() || 'pi pi-calendar' : row.icon,
      location: dto.location !== undefined ? dto.location?.trim() || null : row.location,
      timeLabel: dto.timeLabel !== undefined ? dto.timeLabel?.trim() || null : row.timeLabel,
      sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : row.sortOrder,
    })

    return this.toDto(row)
  }

  async remove(id: string): Promise<void> {
    const row = await this.rushEventModel.findByPk(id)
    if (!row) {
      throw new NotFoundException(`Rush event with ID ${id} not found`)
    }
    await row.destroy()
  }

  private toDto(row: RushEvent): RushEventResponseDto {
    return {
      id: row.id,
      title: row.title,
      displayDate: row.displayDate,
      description: row.description ?? undefined,
      icon: row.icon,
      location: row.location ?? undefined,
      timeLabel: row.timeLabel ?? undefined,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
