import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator'
import { ResourceTag } from '../../database/entities/resource.entity'

export class CreateResourceDto {
  @ApiProperty({ description: 'Document title', example: 'Housing Contract 2026' })
  @IsString()
  @MaxLength(255)
  title!: string

  @ApiPropertyOptional({ description: 'Optional description', example: 'Annual housing agreement' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiProperty({ enum: ResourceTag, description: 'Document category tag' })
  @IsEnum(ResourceTag)
  tag!: ResourceTag
}
