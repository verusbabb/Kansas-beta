import { ApiProperty } from '@nestjs/swagger'

export class ExecPositionPublicDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  code!: string

  @ApiProperty()
  displayName!: string

  @ApiProperty()
  sortOrder!: number
}
