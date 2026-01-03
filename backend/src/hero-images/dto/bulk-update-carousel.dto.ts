import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateCarouselDto {
  @ApiProperty({
    description: 'Array of hero image IDs that should be in the carousel',
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID' })
  imageIds!: string[];
}

