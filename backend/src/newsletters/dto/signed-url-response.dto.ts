import { ApiProperty } from '@nestjs/swagger';

export class SignedUrlResponseDto {
  @ApiProperty({
    description: 'Signed URL for accessing the newsletter PDF',
    example: 'https://storage.googleapis.com/bucket/newsletters/2024/spring/newsletter.pdf?X-Goog-Algorithm=...',
  })
  url!: string;

  @ApiProperty({
    description: 'Expiration time in minutes',
    example: 60,
  })
  expiresInMinutes!: number;
}

