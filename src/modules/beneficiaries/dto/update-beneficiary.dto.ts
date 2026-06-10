import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { BeneficiaryTypeEnum, CurrencyEnum } from "../../../generated/prisma/enums";

export class UpdateBeneficiaryDto {
  @IsString()
  @IsOptional()
  alias?: string;

  @IsEnum(BeneficiaryTypeEnum)
  @IsOptional()
  beneficiaryType?: BeneficiaryTypeEnum;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsEnum(CurrencyEnum)
  @IsOptional()
  currency?: CurrencyEnum;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
