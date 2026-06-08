import { IsEnum, IsNumber, IsPositive, NotEquals } from "class-validator";
import { CurrencyEnum } from "../../../generated/prisma/enums";

export class ExchangeDto {
  @IsEnum(CurrencyEnum)
  fromCurrency!: CurrencyEnum;

  @IsEnum(CurrencyEnum)
  @NotEquals("", { message: "toCurrency must differ from fromCurrency" })
  toCurrency!: CurrencyEnum;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}
