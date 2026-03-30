import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  zip!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  pledgeClassYear?: number | null;

  @ApiProperty()
  isMember!: boolean;

  @ApiProperty()
  isParent!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
