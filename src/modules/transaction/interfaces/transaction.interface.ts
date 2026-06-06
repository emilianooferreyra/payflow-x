import { CurrencyEnum, TransactionTypeEnum } from '../../../generated/prisma/enums'

export interface GetTransactionsInterface {
  userId: string
  page: number
  limit: number
  type?: TransactionTypeEnum
  currency?: CurrencyEnum
  dateFrom?: string
  dateTo?: string
}
