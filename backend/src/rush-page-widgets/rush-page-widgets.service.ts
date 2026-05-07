import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { PinoLogger } from 'nestjs-pino'
import { RushPageWidget } from '../database/entities/rush-page-widget.entity'
import { UpdateRushPageWidgetDto } from './dto/update-rush-page-widget.dto'
import { RushPageWidgetResponseDto } from './dto/rush-page-widget-response.dto'

@Injectable()
export class RushPageWidgetsService {
  constructor(
    @InjectModel(RushPageWidget)
    private widgetModel: typeof RushPageWidget,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushPageWidgetsService.name)
  }

  async findPublic(): Promise<RushPageWidgetResponseDto[]> {
    const rows = await this.widgetModel.findAll({
      order: [['slotIndex', 'ASC']],
    })
    return rows.map((r) => this.toDto(r))
  }

  async findAllAdmin(): Promise<RushPageWidgetResponseDto[]> {
    return this.findPublic()
  }

  async update(id: string, dto: UpdateRushPageWidgetDto): Promise<RushPageWidgetResponseDto> {
    const row = await this.widgetModel.findByPk(id)
    if (!row) {
      throw new NotFoundException(`Rush page widget ${id} not found`)
    }

    await row.update({
      title: dto.title !== undefined ? dto.title.trim() : row.title,
        bodyHtml:
        dto.bodyHtml !== undefined
          ? dto.bodyHtml.trim() === ''
            ? null
            : dto.bodyHtml
          : row.bodyHtml,
    })

    return this.toDto(row)
  }

  private toDto(row: RushPageWidget): RushPageWidgetResponseDto {
    return {
      id: row.id,
      slotIndex: row.slotIndex,
      title: row.title,
      bodyHtml: row.bodyHtml ?? undefined,
      updatedAt: row.updatedAt,
    }
  }
}
