import { IsEnum, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrencyEnum, TransactionTypeEnum } from '../../../generated/prisma/enums'

export class GetTransactionsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page: number = 1

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit: number = 20

  @IsEnum(TransactionTypeEnum)
  @IsOptional()
  type?: TransactionTypeEnum

  @IsEnum(CurrencyEnum)
  @IsOptional()
  currency?: CurrencyEnum

  @IsISO8601()
  @IsOptional()
  dateFrom?: string

  @IsISO8601()
  @IsOptional()
  dateTo?: string
}
