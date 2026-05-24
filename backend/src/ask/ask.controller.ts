import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'
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
  async ask(@Body() dto: AskQueryDto, @Req() _req: unknown): Promise<AskResponseDto> {
    return this.askService.ask(dto)
  }

  @Post('enrich')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Phase-2: enrich a list of alumni with professional data' })
  @ApiResponse({ status: HttpStatus.OK, type: EnrichResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Login required' })
  async enrich(@Body() dto: EnrichRequestDto, @Req() _req: unknown): Promise<EnrichResponseDto> {
    return this.askService.enrich(dto)
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: re-index all site content into the knowledge base (runs in background)' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Indexing started in background' })
  reindex(@Req() _req: unknown): { status: string } {
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
  reindexStatus(@Req() _req: unknown): IndexingStatus {
    return this.indexingService.getStatus()
  }
}
