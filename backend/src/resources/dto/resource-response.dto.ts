import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ResourceTag } from '../../database/entities/resource.entity'

export class ResourceVersionDto {
  @ApiProperty() id!: string
  @ApiProperty() resourceId!: string
  @ApiProperty() filePath!: string
  @ApiProperty() originalFilename!: string
  @ApiProperty() contentType!: string
  @ApiProperty() fileSize!: number
  @ApiProperty() versionNumber!: number
  @ApiProperty() uploadedBy!: string
  @ApiProperty() createdAt!: Date
  @ApiProperty() updatedAt!: Date
}

export class ResourceResponseDto {
  @ApiProperty() id!: string
  @ApiProperty() title!: string
  @ApiPropertyOptional() description?: string | null
  @ApiProperty({ enum: ResourceTag }) tag!: ResourceTag
  @ApiProperty() uploadedBy!: string
  @ApiProperty() createdAt!: Date
  @ApiProperty() updatedAt!: Date
  @ApiPropertyOptional({ type: ResourceVersionDto }) currentVersion?: ResourceVersionDto | null
  @ApiPropertyOptional({ type: [ResourceVersionDto] }) versions?: ResourceVersionDto[]
}
