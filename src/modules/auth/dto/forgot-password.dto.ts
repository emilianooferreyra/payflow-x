import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: 'demo@payflow.com' })
  @IsEmail()
  email!: string;
}
