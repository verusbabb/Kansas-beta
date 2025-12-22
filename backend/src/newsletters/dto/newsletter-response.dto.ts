import { ApiProperty } from '@nestjs/swagger';

export class NewsletterResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the newsletter',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'URL to the newsletter PDF or webpage',
    example: 'https://example.com/newsletters/spring-2024.pdf',
  })
  link!: string;

  @ApiProperty({
    description: 'Season of the newsletter',
    enum: ['spring', 'summer', 'fall', 'winter'],
    example: 'spring',
  })
  season!: 'spring' | 'summer' | 'fall' | 'winter';

  @ApiProperty({
    description: 'Year of the newsletter',
    example: 2024,
  })
  year!: number;

  @ApiProperty({
    description: 'Date when the newsletter was created',
    example: '2024-12-21T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when the newsletter was last updated',
    example: '2024-12-21T10:00:00.000Z',
  })
  updatedAt!: Date;
}

