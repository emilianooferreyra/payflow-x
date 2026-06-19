import { IsEnum, IsString, Matches, NotEquals } from "class-validator";
import { CurrencyEnum } from "../../../generated/prisma/enums";
import { AMOUNT_PATTERN } from "./amount.dto";

export class ExchangeDto {
  @IsEnum(CurrencyEnum)
  fromCurrency!: CurrencyEnum;

  @IsEnum(CurrencyEnum)
  @NotEquals("", { message: "toCurrency must differ from fromCurrency" })
  toCurrency!: CurrencyEnum;

  @IsString()
  @Matches(AMOUNT_PATTERN, { message: "amount must be a positive decimal string" })
  amount!: string;
}
