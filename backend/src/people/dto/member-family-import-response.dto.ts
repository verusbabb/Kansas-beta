import { ApiProperty } from '@nestjs/swagger'

export class FamilyImportSkippedRowDto {
  @ApiProperty({ description: '1-based row number in the uploaded file' })
  sourceRow!: number

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty()
  email!: string

  @ApiProperty({ description: 'Human-readable reason this row was skipped' })
  reason!: string
}

export class MemberFamilyImportResponseDto {
  @ApiProperty({ description: 'Member records newly inserted' })
  membersAdded!: number

  @ApiProperty({ description: 'Member records updated (already existed by email)' })
  membersUpdated!: number

  @ApiProperty({ description: 'Parent records newly inserted' })
  parentsAdded!: number

  @ApiProperty({ description: 'Parent records updated (already existed by email)' })
  parentsUpdated!: number

  @ApiProperty({ description: 'Member↔parent relationship records created' })
  relationshipsCreated!: number

  @ApiProperty({ description: 'Login invites sent (Auth0 provisioned), when requested' })
  invitesSent!: number

  @ApiProperty({ description: 'Rows skipped entirely (member required fields failed)' })
  skippedCount!: number

  @ApiProperty({
    type: [FamilyImportSkippedRowDto],
    description: 'Detail for each fully-skipped row',
  })
  skipped!: FamilyImportSkippedRowDto[]

  @ApiProperty({
    type: [String],
    description: 'Non-fatal warnings (e.g. parent column data partial — member was still imported)',
  })
  warnings!: string[]
}
