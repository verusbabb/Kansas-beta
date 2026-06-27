import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { RushProspectsService } from './rush-prospects.service'
import { CreateRushProspectDto } from './dto/create-rush-prospect.dto'
import { UpdateRushProspectDto } from './dto/update-rush-prospect.dto'
import { CreateRushProspectActivityDto } from './dto/create-rush-prospect-activity.dto'
import { RushProspectSummaryDto } from './dto/rush-prospect-summary.dto'
import {
  RushProspectResponseDto,
  MemberLegacySearchResultDto,
} from './dto/rush-prospect-response.dto'
import { RushProspectActivityResponseDto } from './dto/rush-prospect-activity-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'
import { Request } from 'express'

@ApiTags('Rush Prospects')
@Controller('rush-prospects')
export class RushProspectsController {
  constructor(
    private readonly rushProspectsService: RushProspectsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushProspectsController.name)
  }

  /** Public: submit or resubmit an application */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a rush application (public)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RushProspectSummaryDto })
  async submit(@Body() dto: CreateRushProspectDto): Promise<RushProspectSummaryDto> {
    return this.rushProspectsService.submitApplication(dto)
  }

  /** Public: search current members by name for legacy relative field */
  @Get('legacy-search')
  @ApiOperation({
    summary: 'Search Alpha Nu members by name for legacy field (public, names only)',
  })
  @ApiQuery({ name: 'q', description: 'Search query (min 2 characters)', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: [MemberLegacySearchResultDto] })
  async legacySearch(@Query('q') q: string): Promise<MemberLegacySearchResultDto[]> {
    return this.rushProspectsService.legacySearch(q ?? '')
  }

  /** List prospects for a given rush year */
  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.RUSH_CHAIR, UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rush prospects (member/rush chair/editor/admin)' })
  @ApiQuery({ name: 'rushYear', required: false, type: Number })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: [RushProspectSummaryDto] })
  async findAll(
    @Query('rushYear') rushYearParam?: string,
    @Query('stage') stage?: string,
    @Query('search') search?: string,
  ): Promise<RushProspectSummaryDto[]> {
    const rushYear = rushYearParam ? parseInt(rushYearParam, 10) : new Date().getFullYear()
    return this.rushProspectsService.findAll(rushYear, stage, search)
  }

  /** Get one prospect with full activity log */
  @Get(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.RUSH_CHAIR, UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get prospect detail with activity log (member/rush chair/editor/admin)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: RushProspectResponseDto })
  async findOne(@Param('id') id: string): Promise<RushProspectResponseDto> {
    return this.rushProspectsService.findOne(id)
  }

  /** Update prospect fields or pipeline stage */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.RUSH_CHAIR, UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update prospect (rush chair/editor/admin). Stage changes are auto-logged.' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: RushProspectResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRushProspectDto,
    @Req() req: Request,
  ): Promise<RushProspectResponseDto> {
    return this.rushProspectsService.update(id, dto, (req as any).user)
  }

  /** Add a manual activity (note, event attended, call logged) */
  @Post(':id/activities')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.RUSH_CHAIR, UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log an activity for a prospect (member/rush chair/editor/admin)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RushProspectActivityResponseDto })
  async addActivity(
    @Param('id') id: string,
    @Body() dto: CreateRushProspectActivityDto,
    @Req() req: Request,
  ): Promise<RushProspectActivityResponseDto> {
    return this.rushProspectsService.addActivity(id, dto, (req as any).user)
  }

  /** Admin only: soft-delete a prospect */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a prospect (admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(@Param('id') id: string): Promise<void> {
    return this.rushProspectsService.remove(id)
  }
}
