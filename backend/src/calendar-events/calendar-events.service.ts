import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PinoLogger } from 'nestjs-pino';
import { Op } from 'sequelize';
import { CalendarEvent } from '../database/entities/calendar-event.entity';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarEventResponseDto } from './dto/calendar-event-response.dto';

@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectModel(CalendarEvent)
    private calendarEventModel: typeof CalendarEvent,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CalendarEventsService.name);
  }

  /**
   * Create a new calendar event
   */
  async create(createCalendarEventDto: CreateCalendarEventDto): Promise<CalendarEventResponseDto> {
    try {
      // Validate date range
      const startDate = new Date(createCalendarEventDto.startDate);
      const endDate = new Date(createCalendarEventDto.endDate);

      if (endDate < startDate) {
        throw new BadRequestException('End date must be on or after start date');
      }

      // If allDay is true, set times to null
      const startTime = createCalendarEventDto.allDay ? null : createCalendarEventDto.startTime;
      const endTime = createCalendarEventDto.allDay ? null : createCalendarEventDto.endTime;

      // Validate time range if times are provided
      if (!createCalendarEventDto.allDay && startTime && endTime) {
        if (startDate.toDateString() === endDate.toDateString()) {
          // Same day - validate end time is after start time
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (endMinutes <= startMinutes) {
            throw new BadRequestException('End time must be after start time for same-day events');
          }
        }
      }

      const calendarEvent = await this.calendarEventModel.create({
        name: createCalendarEventDto.name,
        description: createCalendarEventDto.description,
        startDate: createCalendarEventDto.startDate,
        endDate: createCalendarEventDto.endDate,
        startTime: startTime || null,
        endTime: endTime || null,
        allDay: createCalendarEventDto.allDay,
      });

      return this.toResponseDto(calendarEvent);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create calendar event', error);
      throw error;
    }
  }

  /**
   * Get all calendar events (for admin)
   */
  async findAll(): Promise<CalendarEventResponseDto[]> {
    try {
      const events = await this.calendarEventModel.findAll({
        order: [['startDate', 'ASC'], ['startTime', 'ASC']],
      });

      return events.map((event) => this.toResponseDto(event));
    } catch (error) {
      this.logger.error('Failed to fetch calendar events', error);
      throw error;
    }
  }

  /**
   * Get upcoming calendar events (endDate >= today)
   */
  async findUpcoming(): Promise<CalendarEventResponseDto[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      const events = await this.calendarEventModel.findAll({
        where: {
          endDate: {
            [Op.gte]: todayString,
          },
        },
        order: [['startDate', 'ASC'], ['startTime', 'ASC']],
      });

      return events.map((event) => this.toResponseDto(event));
    } catch (error) {
      this.logger.error('Failed to fetch upcoming calendar events', error);
      throw error;
    }
  }

  /**
   * Get a calendar event by ID
   */
  async findOne(id: string): Promise<CalendarEventResponseDto> {
    try {
      const event = await this.calendarEventModel.findByPk(id);

      if (!event) {
        throw new NotFoundException(`Calendar event with ID ${id} not found`);
      }

      return this.toResponseDto(event);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch calendar event', { id, error });
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async update(id: string, updateCalendarEventDto: UpdateCalendarEventDto): Promise<CalendarEventResponseDto> {
    try {
      const event = await this.calendarEventModel.findByPk(id);

      if (!event) {
        throw new NotFoundException(`Calendar event with ID ${id} not found`);
      }

      // Validate date range if both dates are being updated
      if (updateCalendarEventDto.startDate && updateCalendarEventDto.endDate) {
        const startDate = new Date(updateCalendarEventDto.startDate);
        const endDate = new Date(updateCalendarEventDto.endDate);

        if (endDate < startDate) {
          throw new BadRequestException('End date must be on or after start date');
        }
      } else if (updateCalendarEventDto.startDate) {
        const startDate = new Date(updateCalendarEventDto.startDate);
        const endDate = new Date(event.endDate);

        if (endDate < startDate) {
          throw new BadRequestException('End date must be on or after start date');
        }
      } else if (updateCalendarEventDto.endDate) {
        const startDate = new Date(event.startDate);
        const endDate = new Date(updateCalendarEventDto.endDate);

        if (endDate < startDate) {
          throw new BadRequestException('End date must be on or after start date');
        }
      }

      // Handle allDay flag
      const allDay = updateCalendarEventDto.allDay !== undefined 
        ? updateCalendarEventDto.allDay 
        : event.allDay;

      // If allDay is true, set times to null
      // Convert event times to strings if they're Date objects
      const eventStartTimeStr = event.startTime 
        ? (typeof event.startTime === 'string' ? event.startTime : event.startTime.toString().substring(0, 5))
        : null;
      const eventEndTimeStr = event.endTime 
        ? (typeof event.endTime === 'string' ? event.endTime : event.endTime.toString().substring(0, 5))
        : null;
      
      const startTime = allDay ? null : (updateCalendarEventDto.startTime ?? eventStartTimeStr);
      const endTime = allDay ? null : (updateCalendarEventDto.endTime ?? eventEndTimeStr);

      // Validate time range if times are provided and not all day
      if (!allDay && startTime && endTime) {
        const startDate = updateCalendarEventDto.startDate 
          ? new Date(updateCalendarEventDto.startDate) 
          : new Date(event.startDate);
        const endDate = updateCalendarEventDto.endDate 
          ? new Date(updateCalendarEventDto.endDate) 
          : new Date(event.endDate);

        if (startDate.toDateString() === endDate.toDateString()) {
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          if (endMinutes <= startMinutes) {
            throw new BadRequestException('End time must be after start time for same-day events');
          }
        }
      }

      await event.update({
        name: updateCalendarEventDto.name ?? event.name,
        description: updateCalendarEventDto.description !== undefined 
          ? updateCalendarEventDto.description 
          : event.description,
        startDate: updateCalendarEventDto.startDate ?? event.startDate,
        endDate: updateCalendarEventDto.endDate ?? event.endDate,
        startTime: startTime || null,
        endTime: endTime || null,
        allDay,
      });

      return this.toResponseDto(event);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update calendar event', { id, error });
      throw error;
    }
  }

  /**
   * Delete a calendar event (soft delete)
   */
  async remove(id: string): Promise<void> {
    try {
      const event = await this.calendarEventModel.findByPk(id);

      if (!event) {
        throw new NotFoundException(`Calendar event with ID ${id} not found`);
      }

      await event.destroy();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete calendar event', { id, error });
      throw error;
    }
  }

  /**
   * Convert CalendarEvent entity to response DTO
   */
  private toResponseDto(event: CalendarEvent): CalendarEventResponseDto {
    // DATEONLY fields are strings, not Date objects in Sequelize
    const startDate = typeof event.startDate === 'string' 
      ? event.startDate 
      : new Date(event.startDate).toISOString().split('T')[0];
    const endDate = typeof event.endDate === 'string' 
      ? event.endDate 
      : new Date(event.endDate).toISOString().split('T')[0];

    // TIME fields can be strings or Date objects
    let startTime: string | undefined;
    if (event.startTime) {
      const timeValue = event.startTime as any;
      if (typeof timeValue === 'string') {
        startTime = timeValue.substring(0, 5);
      } else {
        startTime = timeValue.toString().substring(0, 5);
      }
    }

    let endTime: string | undefined;
    if (event.endTime) {
      const timeValue = event.endTime as any;
      if (typeof timeValue === 'string') {
        endTime = timeValue.substring(0, 5);
      } else {
        endTime = timeValue.toString().substring(0, 5);
      }
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description || undefined,
      startDate, // Already in YYYY-MM-DD format
      endDate, // Already in YYYY-MM-DD format
      startTime,
      endTime,
      allDay: event.allDay,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}

