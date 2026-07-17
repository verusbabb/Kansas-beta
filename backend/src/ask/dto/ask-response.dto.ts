import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

// ---------------------------------------------------------------------------
// Nested profile sub-objects
// ---------------------------------------------------------------------------

export class OfficeHistoryItemDto {
  @ApiProperty() position!: string
  @ApiProperty() season!: 'fall' | 'spring'
  @ApiProperty() year!: number
  @ApiProperty() isCurrent!: boolean
}

export class RelationshipItemDto {
  @ApiProperty() relatedPersonId!: string
  @ApiProperty() relatedPersonName!: string
  @ApiProperty({ nullable: true }) relatedPersonPledgeYear!: number | null
  @ApiProperty({ nullable: true }) relationshipType!: string | null
  /** 'from' = this person initiated the relationship, 'to' = they are the target */
  @ApiProperty() direction!: 'from' | 'to'
}

// ---------------------------------------------------------------------------
// Enrichment input (Phase 1 → Phase 2 handoff)
// ---------------------------------------------------------------------------

export class PersonEnrichInputDto {
  @ApiProperty() @IsString() id!: string
  @ApiProperty() @IsString() firstName!: string
  @ApiProperty() @IsString() lastName!: string
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() linkedinProfileUrl!: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() email!: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() city!: string | null
  @ApiProperty({ nullable: true }) @IsString() @IsOptional() state!: string | null
}

// ---------------------------------------------------------------------------
// Main result card
// ---------------------------------------------------------------------------

export class AlumniResultDto {
  @ApiProperty() id!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty({ nullable: true }) city!: string | null
  @ApiProperty({ nullable: true }) state!: string | null
  @ApiProperty({ nullable: true }) pledgeClassYear!: number | null
  @ApiProperty({ nullable: true }) linkedinProfileUrl!: string | null
  @ApiProperty({ nullable: true }) email!: string | null
  @ApiProperty({ nullable: true }) employer!: string | null
  @ApiProperty({ nullable: true }) jobTitle!: string | null
  @ApiProperty({ nullable: true }) profileHeadshotFilePath!: string | null

  /** Office positions held in the chapter (exec team history). */
  @ApiProperty({ type: [OfficeHistoryItemDto] }) officeHistory!: OfficeHistoryItemDto[]

  /** Legacy and family relationships to other members. */
  @ApiProperty({ type: [RelationshipItemDto] }) relationships!: RelationshipItemDto[]
}

// ---------------------------------------------------------------------------
// Phase-1 response
// ---------------------------------------------------------------------------

export class NewsletterSourceDto {
  @ApiProperty() id!: string
  @ApiProperty() season!: string
  @ApiProperty() year!: number
  @ApiProperty({ nullable: true }) title!: string | null
}

/**
 * Diagnostic trace of how the agent answered a query. Surfaced so admins can
 * see which engine ran, how many reasoning steps it took, and which tools it
 * called — and, crucially, whether it fell back to the legacy router.
 */
export class AgentTraceDto {
  /** 'agent' = function-calling agent answered; 'fallback' = legacy intent router answered. */
  @ApiProperty({ enum: ['agent', 'fallback'] }) engine!: 'agent' | 'fallback'

  /** Number of agent reasoning steps (tool round-trips). 0 for the fallback path. */
  @ApiProperty() steps!: number

  /** Names of tools the agent invoked, in call order (may repeat). */
  @ApiProperty({ type: [String] }) toolsUsed!: string[]

  /** Total server-side latency in milliseconds. */
  @ApiProperty() latencyMs!: number

  /** Reason the agent fell back, when engine === 'fallback'. Null otherwise. */
  @ApiProperty({ nullable: true }) fallbackReason!: string | null

  /** Read-only SQL the agent ran (admins only; null for non-admins). */
  @ApiProperty({ type: [String], nullable: true }) sql!: string[] | null
}

export class AskResponseDto {
  /** Human-readable summary of what was searched for. */
  @ApiProperty() interpretation!: string

  /** 'member_directory' | 'site_content' | 'mixed' */
  @ApiProperty() queryType!: string

  /** Natural-language answer for site_content queries (RAG). Null for member_directory queries. */
  @ApiProperty({ nullable: true }) answer!: string | null

  /** Newsletter sources referenced in the RAG answer. Empty for non-newsletter queries. */
  @ApiProperty({ type: () => NewsletterSourceDto, isArray: true }) sources!: NewsletterSourceDto[]

  @ApiProperty({ type: [AlumniResultDto] }) results!: AlumniResultDto[]
  @ApiProperty() totalDbMatches!: number

  /** Diagnostic trace (engine/steps/tools/latency). Always present. */
  @ApiProperty({ type: () => AgentTraceDto }) trace!: AgentTraceDto
}

// ---------------------------------------------------------------------------
// Phase-2 enrichment endpoint DTOs
// ---------------------------------------------------------------------------

export class EnrichRequestDto {
  @ApiProperty({ type: [PersonEnrichInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonEnrichInputDto)
  people!: PersonEnrichInputDto[]

  @ApiProperty({ nullable: true })
  @IsString()
  @IsOptional()
  professionalCriteria!: string | null
}

export class PersonEnrichResultDto {
  @ApiProperty() id!: string
  @ApiProperty() enriched!: boolean
  @ApiProperty({ nullable: true }) employer!: string | null
  @ApiProperty({ nullable: true }) jobTitle!: string | null
  @ApiProperty({ nullable: true }) industry!: string | null
  @ApiProperty({ nullable: true }) headline!: string | null
  @ApiProperty({ nullable: true }) linkedinProfileUrl!: string | null
  @ApiProperty({ nullable: true }) linkedinUrlDiscovered!: string | null
  @ApiProperty({ nullable: true }) enrichmentSource!: string | null
  @ApiProperty({ nullable: true }) enrichmentConfidence!: string | null
  @ApiProperty({ nullable: true }) matchReason!: string | null
  /** true = this person was filtered OUT by professional criteria */
  @ApiProperty() excluded!: boolean
}

export class EnrichResponseDto {
  @ApiProperty({ type: [PersonEnrichResultDto] }) results!: PersonEnrichResultDto[]
  @ApiProperty({ nullable: true }) enrichmentSummary!: string | null
}
