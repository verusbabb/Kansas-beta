import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator'

export class BulkInviteDto {
  @ApiProperty({
    description: 'IDs of the directory people to invite. Each must have a personalEmail.',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  personIds!: string[]

  @ApiPropertyOptional({
    description: 'When true, returns counts without creating any users or sending any emails.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun: boolean = false
}

export class BulkInviteResultDto {
  @ApiProperty({ description: 'Total people in the personIds list' })
  total!: number

  @ApiProperty({ description: 'Already had a fully-provisioned account — skipped' })
  skipped!: number

  @ApiProperty({ description: 'Successfully invited (user created + Auth0 provisioned)' })
  invited!: number

  @ApiProperty({ description: 'Auth0 provisioning returned null — will retry next run' })
  failed!: number
}
