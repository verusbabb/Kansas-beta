import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { CalendarEventResponseDto } from './dto/calendar-event-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserLookupGuard } from '../auth/guards/user-lookup.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('Calendar Events')
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(
    private readonly calendarEventsService: CalendarEventsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CalendarEventsController.name);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new calendar event (editor/admin only)',
    description: 'Create a new calendar event with name, description, date range, and optional times',
  })
  @ApiResponse({
    status: 201,
    description: 'Calendar event created successfully',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async create(@Body() createCalendarEventDto: CreateCalendarEventDto): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.create(createCalendarEventDto);
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming calendar events',
    description: 'Retrieve all calendar events where endDate >= today, sorted by start date and time',
  })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming calendar events',
    type: [CalendarEventResponseDto],
  })
  async findUpcoming(): Promise<CalendarEventResponseDto[]> {
    return this.calendarEventsService.findUpcoming();
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all calendar events (editor/admin only)',
    description: 'Retrieve all calendar events including past events, sorted by start date and time',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all calendar events',
    type: [CalendarEventResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  async findAll(): Promise<CalendarEventResponseDto[]> {
    return this.calendarEventsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a calendar event by ID',
    description: 'Retrieve a specific calendar event by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Calendar event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar event found',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Calendar event not found',
  })
  async findOne(@Param('id') id: string): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a calendar event (editor/admin only)',
    description: 'Update an existing calendar event by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Calendar event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar event updated successfully',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Calendar event not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCalendarEventDto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.update(id, updateCalendarEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a calendar event (editor/admin only)',
    description: 'Soft delete a calendar event by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Calendar event UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Calendar event deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Editor or Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Calendar event not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.calendarEventsService.remove(id);
  }
}

