import { CurrencyEnum } from "../../../generated/prisma/enums";

export interface DepositInterface {
  userId: string;
  currency: CurrencyEnum;
  amount: number;
  description?: string;
}

export interface WithdrawInterface {
  userId: string;
  currency: CurrencyEnum;
  amount: number;
  description?: string;
}

export interface ExchangeInterface {
  userId: string;
  fromCurrency: CurrencyEnum;
  toCurrency: CurrencyEnum;
  amount: number;
}

export interface SendInterface {
  userId: string;
  beneficiaryId: string;
  amount: number;
}
