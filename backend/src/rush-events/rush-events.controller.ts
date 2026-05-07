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
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { RushEventsService } from './rush-events.service'
import { CreateRushEventDto } from './dto/create-rush-event.dto'
import { UpdateRushEventDto } from './dto/update-rush-event.dto'
import { RushEventResponseDto } from './dto/rush-event-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'

@ApiTags('Rush Events')
@Controller('rush-events')
export class RushEventsController {
  constructor(
    private readonly rushEventsService: RushEventsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushEventsController.name)
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create rush event (editor/admin)' })
  @ApiResponse({ status: 201, type: RushEventResponseDto })
  async create(@Body() dto: CreateRushEventDto): Promise<RushEventResponseDto> {
    return this.rushEventsService.create(dto)
  }

  @Get('public')
  @ApiOperation({ summary: 'List rush events for public /rush page' })
  @ApiResponse({ status: 200, type: [RushEventResponseDto] })
  async findPublic(): Promise<RushEventResponseDto[]> {
    return this.rushEventsService.findPublic()
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all rush events (editor/admin)' })
  @ApiResponse({ status: 200, type: [RushEventResponseDto] })
  async findAll(): Promise<RushEventResponseDto[]> {
    return this.rushEventsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rush event by id' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: RushEventResponseDto })
  @ApiResponse({ status: 404 })
  async findOne(@Param('id') id: string): Promise<RushEventResponseDto> {
    return this.rushEventsService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rush event (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: RushEventResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRushEventDto,
  ): Promise<RushEventResponseDto> {
    return this.rushEventsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete rush event (editor/admin, soft)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rushEventsService.remove(id)
  }
}
