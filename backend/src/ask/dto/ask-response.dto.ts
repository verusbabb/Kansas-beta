import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class PersonEnrichInputDto {
  @ApiProperty() @IsString() id: string
  @ApiProperty() @IsString() firstName: string
  @ApiProperty() @IsString() lastName: string
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() linkedinProfileUrl: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() email: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() city: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() state: string | null
}

export class AlumniResultDto {
  @ApiProperty() id: string
  @ApiProperty() firstName: string
  @ApiProperty() lastName: string
  @ApiProperty({ nullable: true }) city: string | null
  @ApiProperty({ nullable: true }) state: string | null
  @ApiProperty({ nullable: true }) pledgeClassYear: number | null
  @ApiProperty({ nullable: true }) linkedinProfileUrl: string | null
  @ApiProperty({ nullable: true }) email: string | null

  /** Whether external enrichment data was found for this person. */
  @ApiProperty() enriched: boolean
  @ApiProperty({ nullable: true }) employer: string | null
  @ApiProperty({ nullable: true }) jobTitle: string | null
  @ApiProperty({ nullable: true }) industry: string | null
  /** Brief explanation of why this result matched a professional query. */
  @ApiProperty({ nullable: true }) matchReason: string | null
}

export class AskResponseDto {
  /** Human-readable summary of what was searched for. */
  @ApiProperty() interpretation: string
  @ApiProperty({ type: [AlumniResultDto] }) results: AlumniResultDto[]
  @ApiProperty() totalDbMatches: number
  @ApiProperty() isProfessionalQuery: boolean
  @ApiProperty({ nullable: true }) enrichmentSummary: string | null
  /** Professional criteria string to pass to /ask/enrich (null if not a professional query). */
  @ApiProperty({ nullable: true }) professionalCriteria: string | null
  /** People to enrich — pass directly to POST /ask/enrich. Empty if not a professional query. */
  @ApiProperty({ type: [PersonEnrichInputDto] }) enrichPeople: PersonEnrichInputDto[]
}

// ---------------------------------------------------------------------------
// Phase-2 enrichment endpoint DTOs
// ---------------------------------------------------------------------------

export class EnrichRequestDto {
  @ApiProperty({ type: [PersonEnrichInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonEnrichInputDto)
  people: PersonEnrichInputDto[]

  @ApiProperty({ nullable: true })
  @IsString()
  @IsOptional()
  professionalCriteria: string | null
}

export class PersonEnrichResultDto {
  @ApiProperty() id: string
  @ApiProperty() enriched: boolean
  @ApiProperty({ nullable: true }) employer: string | null
  @ApiProperty({ nullable: true }) jobTitle: string | null
  @ApiProperty({ nullable: true }) industry: string | null
  @ApiProperty({ nullable: true }) linkedinProfileUrl: string | null
  @ApiProperty({ nullable: true }) matchReason: string | null
  /** true = this person was filtered OUT by professional criteria */
  @ApiProperty() excluded: boolean
}

export class EnrichResponseDto {
  @ApiProperty({ type: [PersonEnrichResultDto] }) results: PersonEnrichResultDto[]
  @ApiProperty({ nullable: true }) enrichmentSummary: string | null
}
