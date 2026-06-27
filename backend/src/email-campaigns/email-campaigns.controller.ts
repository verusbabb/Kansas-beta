import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { Request } from 'express'
import { EmailCampaignsService } from './email-campaigns.service'
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto'
import { UpdateEmailCampaignDto } from './dto/update-email-campaign.dto'
import { EmailCampaignSummaryDto } from './dto/email-campaign-summary.dto'
import { EmailCampaignResponseDto } from './dto/email-campaign-response.dto'
import { PreviewRecipientsDto, PreviewRecipientsResponseDto } from './dto/preview-recipients.dto'
import { CampaignRecipientsResponseDto } from './dto/email-campaign-recipient.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { User, UserRole } from '../database/entities/user.entity'

@ApiTags('Email Campaigns')
@Controller('email-campaigns')
@UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
@Roles(UserRole.EDITOR, UserRole.ADMIN)
@ApiBearerAuth()
export class EmailCampaignsController {
  constructor(
    private readonly emailCampaignsService: EmailCampaignsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailCampaignsController.name)
  }

  @Post('preview-recipients')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview how many recipients an audience resolves to (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: PreviewRecipientsResponseDto })
  async previewRecipients(
    @Body() dto: PreviewRecipientsDto,
  ): Promise<PreviewRecipientsResponseDto> {
    return this.emailCampaignsService.previewRecipients(dto)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an email campaign draft (editor/admin)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: EmailCampaignResponseDto })
  async create(
    @Body() dto: CreateEmailCampaignDto,
    @Req() req: Request,
  ): Promise<EmailCampaignResponseDto> {
    return this.emailCampaignsService.create(dto, (req as Request & { user?: User }).user)
  }

  @Get()
  @ApiOperation({ summary: 'List all email campaigns — shared across editors/admins' })
  @ApiResponse({ status: HttpStatus.OK, type: [EmailCampaignSummaryDto] })
  async findAll(): Promise<EmailCampaignSummaryDto[]> {
    return this.emailCampaignsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one email campaign with full body (editor/admin)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: EmailCampaignResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmailCampaignResponseDto> {
    return this.emailCampaignsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a draft campaign (editor/admin). Sent campaigns are read-only.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: EmailCampaignResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailCampaignDto,
  ): Promise<EmailCampaignResponseDto> {
    return this.emailCampaignsService.update(id, dto)
  }

  @Get(':id/recipients')
  @ApiOperation({
    summary: 'List a campaign\u2019s recipients with delivery/open status (editor/admin)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: CampaignRecipientsResponseDto })
  async getRecipients(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignRecipientsResponseDto> {
    return this.emailCampaignsService.getRecipients(id)
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a campaign to its resolved audience (editor/admin)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.OK, type: EmailCampaignResponseDto })
  async send(@Param('id', ParseUUIDPipe) id: string): Promise<EmailCampaignResponseDto> {
    return this.emailCampaignsService.send(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign (editor/admin)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.emailCampaignsService.remove(id)
  }
}
