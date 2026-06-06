import { CurrencyEnum } from '../../../generated/prisma/enums.js'

export interface DepositInterface {
  userId: string
  currency: CurrencyEnum
  amount: number
  description?: string
}

export interface WithdrawInterface {
  userId: string
  currency: CurrencyEnum
  amount: number
  description?: string
}

export interface ExchangeInterface {
  userId: string
  fromCurrency: CurrencyEnum
  toCurrency: CurrencyEnum
  amount: number
}
