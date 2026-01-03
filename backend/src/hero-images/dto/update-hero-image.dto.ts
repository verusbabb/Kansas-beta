import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateHeroImageDto {
  @ApiProperty({
    description: 'Optional description for the hero image',
    example: 'Chapter house exterior view',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be at most 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Whether this image should be displayed in the carousel',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isInCarousel?: boolean;
}

