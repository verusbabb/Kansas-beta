import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { ResourcesService, UploadedFile as IUploadedFile } from './resources.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'
import { ResourceResponseDto, ResourceVersionDto } from './dto/resource-response.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole, User } from '../database/entities/user.entity'

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
@Roles(UserRole.MEMBER, UserRole.RUSH_CHAIR, UserRole.EDITOR, UserRole.ADMIN)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new resource document (editor/admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title', 'tag'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        tag: { type: 'string', enum: ['legal', 'insurance', 'national', 'other'] },
      },
    },
  })
  @ApiResponse({ status: 201, type: ResourceResponseDto })
  async create(
    @UploadedFile() file: IUploadedFile,
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: User,
  ): Promise<ResourceResponseDto> {
    if (!file) throw new BadRequestException('File is required')
    return this.resourcesService.create(dto, file, user.email)
  }

  @Get()
  @ApiOperation({ summary: 'List all resources with current version (editor/admin only)' })
  @ApiResponse({ status: 200, type: [ResourceResponseDto] })
  async findAll(): Promise<ResourceResponseDto[]> {
    return this.resourcesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single resource by ID' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(@Param('id') id: string): Promise<ResourceResponseDto> {
    return this.resourcesService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resource title/description/tag (editor/admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.resourcesService.update(id, dto)
  }

  @Post(':id/replace')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Replace document with a new file version (editor/admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, type: ResourceResponseDto })
  async replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: IUploadedFile,
    @CurrentUser() user: User,
  ): Promise<ResourceResponseDto> {
    if (!file) throw new BadRequestException('File is required')
    return this.resourcesService.replaceFile(id, file, user.email)
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions of a resource (editor/admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, type: [ResourceVersionDto] })
  async getVersions(@Param('id') id: string): Promise<ResourceVersionDto[]> {
    return this.resourcesService.getVersions(id)
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a download URL for the current version (editor/admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 200, schema: { properties: { url: { type: 'string' } } } })
  async getDownloadUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.resourcesService.getDownloadUrl(id)
    return { url }
  }

  @Get(':id/versions/:versionId/download')
  @ApiOperation({ summary: 'Get a download URL for a specific version (editor/admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiParam({ name: 'versionId', description: 'Version UUID' })
  @ApiResponse({ status: 200, schema: { properties: { url: { type: 'string' } } } })
  async getVersionDownloadUrl(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<{ url: string }> {
    const url = await this.resourcesService.getDownloadUrl(id, versionId)
    return { url }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a resource (admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiResponse({ status: 204, description: 'Resource deleted' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.resourcesService.remove(id)
  }
}
