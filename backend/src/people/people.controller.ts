import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserLookupGuard } from '../auth/guards/user-lookup.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('People')
@Controller('people')
export class PeopleController {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PeopleController.name);
  }

  @Get()
  @ApiOperation({
    summary: 'List directory people (public)',
    description: 'Returns all people in the chapter directory for display on the public site.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PersonResponseDto] })
  async findAll(): Promise<PersonResponseDto[]> {
    return this.peopleService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Update a directory person (editor/admin)',
    description: 'Partial update; email must remain unique.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'Person UUID' })
  @ApiOperation({
    summary: 'Remove a directory person (editor/admin)',
    description: 'Soft-deletes the person; they no longer appear in the public directory.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Person removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.peopleService.remove(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a chapter directory person (editor/admin)',
    description: 'Adds one member and/or parent record with unique email.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PersonResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Editor or admin required' })
  async create(@Body() dto: CreatePersonDto): Promise<PersonResponseDto> {
    return this.peopleService.create(dto);
  }
}
