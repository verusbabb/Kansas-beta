import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength, MaxLength } from 'class-validator'

export class AskQueryDto {
  @ApiProperty({ example: 'Which alumni live in Chicago and work in finance?' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  query: string
}
