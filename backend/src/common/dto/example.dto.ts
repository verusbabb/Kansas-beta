import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

/**
 * Example DTO demonstrating validation decorators
 * This file can be deleted or used as a reference
 */
export class ExampleDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;
}

