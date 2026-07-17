import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User, UserRole } from '../database/entities/user.entity'
import { AskService } from './ask.service'
import { IndexingService, IndexingStatus } from '../knowledge/indexing.service'
import { AskQueryDto } from './dto/ask-query.dto'
import { AskResponseDto, EnrichRequestDto, EnrichResponseDto } from './dto/ask-response.dto'

@ApiTags('Ask')
@Controller('ask')
export class AskController {
  constructor(
    private readonly askService: AskService,
    private readonly indexingService: IndexingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Natural-language search — returns member results and/or RAG answer' })
  @ApiResponse({ status: HttpStatus.OK, type: AskResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Login required' })
  async ask(@Body() dto: AskQueryDto, @CurrentUser() user: User): Promise<AskResponseDto> {
    const isAdmin = user?.role === UserRole.ADMIN
    const canSeeRush = isAdmin || user?.role === UserRole.RUSH_CHAIR
    return this.askService.ask(dto, { isAdmin, canSeeRush })
  }

  @Post('enrich')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Phase-2: enrich a list of alumni with professional data' })
  @ApiResponse({ status: HttpStatus.OK, type: EnrichResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Login required' })
  async enrich(@Body() dto: EnrichRequestDto): Promise<EnrichResponseDto> {
    return this.askService.enrich(dto)
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin: re-index all site content into the knowledge base (runs in background)',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Indexing started in background' })
  reindex(): { status: string } {
    // Fire-and-forget — large datasets take minutes; don't hold the HTTP connection open.
    void this.indexingService.reindexAll()
    return { status: 'started' }
  }

  @Get('reindex/status')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: poll the current reindex job status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Current indexing status' })
  reindexStatus(): IndexingStatus {
    return this.indexingService.getStatus()
  }

  /**
   * Backstop reindex trigger for Cloud Scheduler. Authenticated with a shared
   * secret header (REINDEX_TRIGGER_TOKEN) rather than a user JWT, so the cron
   * job can run unattended. Idempotent and safe to call repeatedly.
   */
  @Post('reindex/scheduled')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Cloud Scheduler: trigger a full reindex (shared-secret header auth)' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Indexing started in background' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid trigger token' })
  reindexScheduled(@Headers('x-reindex-token') token?: string): { status: string } {
    const expected = process.env.REINDEX_TRIGGER_TOKEN
    if (!expected || !token || !this.tokensMatch(token, expected)) {
      throw new UnauthorizedException('Invalid or missing reindex token')
    }
    void this.indexingService.reindexAll()
    return { status: 'started' }
  }

  /** Constant-time token comparison to avoid leaking length/content via timing. */
  private tokensMatch(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return timingSafeEqual(aBuf, bBuf)
  }
}
