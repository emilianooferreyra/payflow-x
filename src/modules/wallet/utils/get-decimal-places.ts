import { CurrencyEnum } from "../../../generated/prisma/enums";

const CURRENCY_DECIMALS = {
  [CurrencyEnum.ARS]: 2,
  [CurrencyEnum.USD]: 2,
  [CurrencyEnum.USDT]: 6,
  [CurrencyEnum.BRL]: 2,
} satisfies Record<CurrencyEnum, number>;

export function getDecimalPlaces(currency: CurrencyEnum): number {
  return CURRENCY_DECIMALS[currency] ?? 2;
}

export function isCurrencyEnum(value: string): value is CurrencyEnum {
  return Object.values(CurrencyEnum).includes(value as CurrencyEnum);
}
