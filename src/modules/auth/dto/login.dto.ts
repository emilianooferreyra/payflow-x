import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  /** @example demo@payflow.com */
  @IsEmail()
  email!: string;

  /** @example Demo1234! */
  @IsString()
  @MinLength(8)
  password!: string;
}
