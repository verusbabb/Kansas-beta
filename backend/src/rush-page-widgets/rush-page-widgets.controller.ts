import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
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
import { RushPageWidgetsService } from './rush-page-widgets.service'
import { UpdateRushPageWidgetDto } from './dto/update-rush-page-widget.dto'
import { RushPageWidgetResponseDto } from './dto/rush-page-widget-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'

@ApiTags('Rush Page Widgets')
@Controller('rush-page-widgets')
export class RushPageWidgetsController {
  constructor(
    private readonly widgetsService: RushPageWidgetsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RushPageWidgetsController.name)
  }

  @Get('public')
  @ApiOperation({ summary: 'List Why Rush widgets for public /rush page' })
  @ApiResponse({ status: 200, type: [RushPageWidgetResponseDto] })
  async findPublic(): Promise<RushPageWidgetResponseDto[]> {
    return this.widgetsService.findPublic()
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rush page widgets (editor/admin)' })
  @ApiResponse({ status: 200, type: [RushPageWidgetResponseDto] })
  async findAll(): Promise<RushPageWidgetResponseDto[]> {
    return this.widgetsService.findAllAdmin()
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update widget title/body (editor/admin)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: RushPageWidgetResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRushPageWidgetDto,
  ): Promise<RushPageWidgetResponseDto> {
    return this.widgetsService.update(id, dto)
  }
}
