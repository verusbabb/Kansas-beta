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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserLookupGuard } from '../auth/guards/user-lookup.guard'
import { User } from '../database/entities/user.entity'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
import { OptionalUserLookupGuard } from '../auth/guards/optional-user-lookup.guard'
import { CreatePersonRelationshipDto } from './dto/create-person-relationship.dto'
import { UpdatePersonRelationshipDto } from './dto/update-person-relationship.dto'
import { PersonRelationshipResponseDto } from './dto/person-relationship-response.dto'
import { PersonRelationshipsService } from './person-relationships.service'

@ApiTags('Person relationships')
@Controller('people/:personId/relationships')
export class PersonRelationshipsController {
  constructor(
    private readonly relationshipsService: PersonRelationshipsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PersonRelationshipsController.name)
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard, OptionalUserLookupGuard)
  @ApiParam({ name: 'personId', description: 'Person UUID (viewer / anchor)' })
  @ApiOperation({
    summary: 'List legacy connections for a person (public)',
    description:
      'Returns all non-deleted relationships where this person is `from` or `to`. ' +
      '`viewerIsFrom` indicates whether this person is `fromPersonId` for the directed edge ' +
      '(`from` is the `relationshipType` of `to`, when type is set). ' +
      'Counterpart emails follow the same visibility rules as the directory (guests and opt-outs redacted).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PersonRelationshipResponseDto] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  async findAll(
    @Req() req: { user?: User },
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<PersonRelationshipResponseDto[]> {
    return this.relationshipsService.findAllForPerson(personId, req.user)
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiParam({ name: 'personId', description: 'Person UUID (anchor for direction)' })
  @ApiOperation({
    summary: 'Add a connection (editor/admin or own profile)',
    description:
      'Editors/admins may add for any person. Signed-in members may add only when `personId` is their linked directory profile. ' +
      'Use `direction` to place the anchor person on `from` or `to`. ' +
      '`other_is_from`: counterpart is `from`, anchor is `to`. ' +
      '`other_is_to`: anchor is `from`, counterpart is `to`.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PersonRelationshipResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate directed link' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must be editor/admin or the directory person (linked account)',
  })
  async create(
    @Req() req: { user: User },
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: CreatePersonRelationshipDto,
  ): Promise<PersonRelationshipResponseDto> {
    return this.relationshipsService.create(personId, dto, req.user)
  }

  @Patch(':relationshipId')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'personId', description: 'Person UUID' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiOperation({
    summary: 'Update relationship type or notes (editor/admin or own profile)',
    description: 'Send `relationshipType: null` to clear the type (unspecified link).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PersonRelationshipResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Nothing to update' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person or relationship not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must be editor/admin or the directory person (linked account)',
  })
  async update(
    @Req() req: { user: User },
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('relationshipId', ParseUUIDPipe) relationshipId: string,
    @Body() dto: UpdatePersonRelationshipDto,
  ): Promise<PersonRelationshipResponseDto> {
    return this.relationshipsService.update(personId, relationshipId, dto, req.user)
  }

  @Delete(':relationshipId')
  @UseGuards(JwtAuthGuard, UserLookupGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiParam({ name: 'personId', description: 'Person UUID' })
  @ApiParam({ name: 'relationshipId', description: 'Relationship UUID' })
  @ApiOperation({
    summary: 'Remove a connection (editor/admin or own profile)',
    description: 'Soft-deletes the relationship row.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Relationship removed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Person or relationship not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must be editor/admin or the directory person (linked account)',
  })
  async remove(
    @Req() req: { user: User },
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('relationshipId', ParseUUIDPipe) relationshipId: string,
  ): Promise<void> {
    return this.relationshipsService.remove(personId, relationshipId, req.user)
  }
}
