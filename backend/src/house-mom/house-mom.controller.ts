import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PinoLogger } from 'nestjs-pino'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../database/entities/user.entity'
import { HouseMomService, type HouseMomPhotoFile } from './house-mom.service'
import { HouseMomPublicDto } from './dto/house-mom-public.dto'
import { UpdateHouseMomDto } from './dto/update-house-mom.dto'

@ApiTags('House mom')
@Controller('house-mom')
export class HouseMomController {
  constructor(
    private readonly houseMomService: HouseMomService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HouseMomController.name)
  }

  @Get()
  @ApiOperation({ summary: 'House mom profile for public People page' })
  @ApiResponse({ status: HttpStatus.OK, type: HouseMomPublicDto })
  async getPublic(): Promise<HouseMomPublicDto> {
    return this.houseMomService.getPublic()
  }

  @Put()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update house mom name, contact, and bio (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: HouseMomPublicDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async update(@Body() dto: UpdateHouseMomDto): Promise<HouseMomPublicDto> {
    return this.houseMomService.updateProfile(dto)
  }

  @Post('photo')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or replace house mom photo (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: HouseMomPublicDto })
  async uploadPhoto(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'image/(jpeg|jpg|png|webp|gif)' }),
        ],
      }),
    )
    file: HouseMomPhotoFile,
  ): Promise<HouseMomPublicDto> {
    if (!file) {
      throw new BadRequestException('File is required')
    }
    return this.houseMomService.uploadPhoto(file)
  }

  @Delete('photo')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove house mom photo (editor/admin)' })
  @ApiResponse({ status: HttpStatus.OK, type: HouseMomPublicDto })
  async clearPhoto(): Promise<HouseMomPublicDto> {
    return this.houseMomService.clearPhoto()
  }
}
