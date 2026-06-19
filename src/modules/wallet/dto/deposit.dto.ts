import { IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { CurrencyEnum } from "../../../generated/prisma/enums";
import { AMOUNT_PATTERN } from "./amount.dto";

export class DepositDto {
  @IsEnum(CurrencyEnum)
  currency!: CurrencyEnum;

  @IsString()
  @Matches(AMOUNT_PATTERN, { message: "amount must be a positive decimal string" })
  amount!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
