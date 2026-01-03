import { ApiProperty } from '@nestjs/swagger';

export class HeroImageResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the hero image',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'File path to the hero image in Cloud Storage',
    example: 'hero-images/2026/01/image.jpg',
  })
  filePath!: string;

  @ApiProperty({
    description: 'Optional description for the hero image',
    example: 'Chapter house exterior view',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Email of the user who uploaded the image',
    example: 'admin@example.com',
  })
  uploadedBy!: string;

  @ApiProperty({
    description: 'Whether this image is displayed in the carousel',
    example: true,
  })
  isInCarousel!: boolean;

  @ApiProperty({
    description: 'Date when the hero image was created',
    example: '2026-01-03T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when the hero image was last updated',
    example: '2026-01-03T10:00:00.000Z',
  })
  updatedAt!: Date;
}

