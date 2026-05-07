import { ApiProperty } from '@nestjs/swagger'

export class RushPhotoResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string

  @ApiProperty({ example: 'rush-photos/2026/05/1234567890-photo.jpg' })
  filePath!: string

  @ApiProperty({ required: false, example: 'Brothers at the chapter house BBQ' })
  caption?: string

  @ApiProperty({ example: 0 })
  sortOrder!: number

  @ApiProperty({ example: 'editor@kansasbeta.org' })
  uploadedBy!: string

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}
