import { IsEnum } from "class-validator";
import { CurrencyEnum } from "../../../generated/prisma/enums";

export class QueryRateDto {
  @IsEnum(CurrencyEnum)
  from!: CurrencyEnum;

  @IsEnum(CurrencyEnum)
  to!: CurrencyEnum;
}
