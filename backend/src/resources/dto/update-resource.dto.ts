import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator'
import { ResourceTag } from '../../database/entities/resource.entity'

export class UpdateResourceDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({ enum: ResourceTag, description: 'Document category tag' })
  @IsOptional()
  @IsEnum(ResourceTag)
  tag?: ResourceTag
}
