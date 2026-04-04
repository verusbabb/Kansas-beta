import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class BulkImportResponseDto {
  @ApiProperty({
    description:
      'Rows applied (new inserts plus updates / adopts by Contact ID or email).',
  })
  importedCount!: number

  @ApiProperty({ description: 'Number of rows skipped (see skippedFileContent)' })
  skippedCount!: number

  @ApiProperty({
    description:
      'Skipped rows as CSV/TSV (same delimiter as upload) with source_row and skip_reason columns. Empty string if none.',
  })
  skippedFileContent!: string

  @ApiPropertyOptional({
    description:
      'Suggested spreadsheet type for skippedFileContent: csv (comma) or tsv (tab). Omitted when skippedCount is 0.',
    enum: ['csv', 'tsv'],
  })
  skippedFileFormat?: 'csv' | 'tsv'
}
