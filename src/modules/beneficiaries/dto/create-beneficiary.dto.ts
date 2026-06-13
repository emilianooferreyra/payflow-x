import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import {
  BeneficiaryTypeEnum,
  CurrencyEnum,
} from "../../../generated/prisma/enums";

export class CreateBeneficiaryDto {
  @IsString()
  alias!: string;

  @IsEnum(BeneficiaryTypeEnum)
  beneficiaryType!: BeneficiaryTypeEnum;

  @IsString()
  accountNumber!: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsEnum(CurrencyEnum)
  currency!: CurrencyEnum;

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
