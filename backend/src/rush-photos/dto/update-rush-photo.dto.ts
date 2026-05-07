import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateRushPhotoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
