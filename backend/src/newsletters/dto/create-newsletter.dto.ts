import { IsString, IsUrl, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsletterDto {
  @ApiProperty({
    description: 'URL to the newsletter PDF or webpage',
    example: 'https://example.com/newsletters/spring-2024.pdf',
  })
  @IsUrl({}, { message: 'Link must be a valid URL' })
  @IsString()
  link!: string;

  @ApiProperty({
    description: 'Season of the newsletter',
    enum: ['spring', 'summer', 'fall', 'winter'],
    example: 'spring',
  })
  @IsEnum(['spring', 'summer', 'fall', 'winter'], {
    message: 'Season must be one of: spring, summer, fall, winter',
  })
  season!: 'spring' | 'summer' | 'fall' | 'winter';

  @ApiProperty({
    description: 'Year of the newsletter',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsInt({ message: 'Year must be an integer' })
  @Min(2000, { message: 'Year must be at least 2000' })
  @Max(2100, { message: 'Year must be at most 2100' })
  year!: number;
}

