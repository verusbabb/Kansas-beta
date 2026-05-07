import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateRushPageWidgetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @ApiProperty({
    description: 'Rich text body (HTML)',
    required: false,
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string
}
