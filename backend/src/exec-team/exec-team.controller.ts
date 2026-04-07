import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { User, UserRole } from '../database/entities/user.entity'
import { ExecTeamService } from './exec-team.service'
import { ExecPositionPublicDto } from './dto/exec-position-public.dto'
import { ExecTermPublicDto } from './dto/exec-term-public.dto'
import { ExecRosterResponseDto } from './dto/exec-roster-response.dto'
import { CreateExecTermDto } from './dto/create-exec-term.dto'
import { UpdateExecTermDto } from './dto/update-exec-term.dto'
import { ReplaceExecRosterDto } from './dto/replace-exec-roster.dto'
import { ClaimMyExecAssignmentDto } from './dto/claim-my-exec-assignment.dto'
import { ReleaseMyExecAssignmentDto } from './dto/release-my-exec-assignment.dto'
import { PersonExecHistoryEntryDto } from './dto/person-exec-history-entry.dto'

@ApiTags('Exec team')
@Controller('exec-team')
export class ExecTeamController {
  constructor(
    private readonly execTeamService: ExecTeamService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExecTeamController.name)
  }

  @Get('positions')
  @ApiOperation({ summary: 'List exec position titles (public)' })
  @ApiResponse({ status: HttpStatus.OK, type: [ExecPositionPublicDto] })
  async positions(): Promise<ExecPositionPublicDto[]> {
    return this.execTeamService.findAllPositions()
  }

  @Get('terms')
  @ApiOperation({ summary: 'List exec terms (public)' })
  @ApiResponse({ status: HttpStatus.OK, type: [ExecTermPublicDto] })
  async terms(): Promise<ExecTermPublicDto[]> {
    return this.execTeamService.findAllTerms()
  }

  @Get('roster')
  @ApiOperation({
    summary: 'Executive roster for display (public)',
    description:
      'Uses `termId` if provided; otherwise the term marked current; otherwise the latest term by year/season.',
  })
  @ApiQuery({ name: 'termId', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: ExecRosterResponseDto })
  async roster(@Query('termId') termId?: string): Promise<ExecRosterResponseDto> {
    return this.execTeamService.getRoster(termId)
  }

  @Post('terms')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fall/spring term (editor/admin)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ExecTermPublicDto })
  async createTerm(@Body() dto: CreateExecTermDto): Promise<ExecTermPublicDto> {
    return this.execTeamService.createTerm(dto)
  }

  @Patch('terms/:id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Exec term UUID' })
  @ApiOperation({ summary: 'Update term label or current flag (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: ExecTermPublicDto })
  async updateTerm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExecTermDto,
  ): Promise<ExecTermPublicDto> {
    return this.execTeamService.updateTerm(id, dto)
  }

  @Delete('terms/:id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Exec term UUID' })
  @ApiOperation({ summary: 'Delete term and its assignments (editor/admin)' })
  async deleteTerm(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.execTeamService.deleteTerm(id)
  }

  @Get('terms/:id/roster')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Exec term UUID' })
  @ApiOperation({ summary: 'Roster for a specific term (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: ExecRosterResponseDto })
  async rosterForTerm(@Param('id', ParseUUIDPipe) id: string): Promise<ExecRosterResponseDto> {
    return this.execTeamService.getRosterForTerm(id)
  }

  @Put('terms/:id/roster')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Exec term UUID' })
  @ApiOperation({ summary: 'Replace all assignments for a term (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: ExecRosterResponseDto })
  async replaceRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceExecRosterDto,
  ): Promise<ExecRosterResponseDto> {
    return this.execTeamService.replaceRoster(id, dto)
  }

  @Post('my-exec-assignment')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim one executive office for your linked profile (member)',
    description:
      'Creates the Fall/Spring term if it does not exist yet (never sets current term). ' +
      'Updates only this position for that term. Fails with 409 if another member already holds the office.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonExecHistoryEntryDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Office already assigned to someone else' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not linked or not a member' })
  async claimMyExecAssignment(
    @Req() req: { user: User },
    @Body() dto: ClaimMyExecAssignmentDto,
  ): Promise<PersonExecHistoryEntryDto> {
    const personId = req.user.personId
    if (!personId) {
      throw new ForbiddenException(
        'Your account must be linked to a directory profile to add executive offices.',
      )
    }
    return this.execTeamService.claimMyExecAssignment(personId, dto)
  }

  @Delete('my-exec-assignment')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove one executive office from your linked profile (member)',
    description: 'Clears only your assignment for that position and term.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Removed' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not linked, not a member, or slot held by someone else' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Term or assignment not found' })
  async releaseMyExecAssignment(
    @Req() req: { user: User },
    @Body() dto: ReleaseMyExecAssignmentDto,
  ): Promise<void> {
    const personId = req.user.personId
    if (!personId) {
      throw new ForbiddenException(
        'Your account must be linked to a directory profile to update executive offices.',
      )
    }
    return this.execTeamService.releaseMyExecAssignment(personId, dto)
  }
}
