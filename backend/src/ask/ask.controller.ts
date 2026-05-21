import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { AskService } from './ask.service'
import { AskQueryDto } from './dto/ask-query.dto'
import { AskResponseDto, EnrichRequestDto, EnrichResponseDto } from './dto/ask-response.dto'

@ApiTags('Ask')
@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Natural-language alumni search — returns DB results immediately, no enrichment' })
  @ApiResponse({ status: HttpStatus.OK, type: AskResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Login required' })
  async ask(@Body() dto: AskQueryDto, @Req() _req: unknown): Promise<AskResponseDto> {
    return this.askService.ask(dto)
  }

  @Post('enrich')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Phase-2: enrich a list of alumni with professional data via web search' })
  @ApiResponse({ status: HttpStatus.OK, type: EnrichResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Login required' })
  async enrich(@Body() dto: EnrichRequestDto, @Req() _req: unknown): Promise<EnrichResponseDto> {
    return this.askService.enrich(dto)
  }
}
