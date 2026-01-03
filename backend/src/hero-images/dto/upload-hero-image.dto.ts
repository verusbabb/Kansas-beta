import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadHeroImageDto {
  @ApiProperty({
    description: 'Optional description for the hero image',
    example: 'Chapter house exterior view',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be at most 500 characters' })
  description?: string;
}

