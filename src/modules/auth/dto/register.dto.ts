import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  /** @example user@payflow.com */
  @IsEmail()
  email!: string;

  /** @example MyPassword1! */
  @IsString()
  @MinLength(8)
  password!: string;

  /** @example Nicolás */
  @IsString()
  @IsOptional()
  name?: string;

  /** @example Rodríguez */
  @IsString()
  @IsOptional()
  lastName?: string;

  /** @example +5491123456789 */
  @IsString()
  @IsOptional()
  phone?: string;

  /** @example AR */
  @IsString()
  @IsOptional()
  country?: string;

  /** ReCAPTCHA v3 token from frontend */
  @IsString()
  @IsOptional()
  recaptchaToken?: string;
}
