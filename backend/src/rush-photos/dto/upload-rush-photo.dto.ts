import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class UploadRushPhotoDto {
  @ApiProperty({ required: false, example: 'Brothers at the chapter house BBQ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}
