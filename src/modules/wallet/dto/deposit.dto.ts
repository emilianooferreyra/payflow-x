import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator'
import { CurrencyEnum } from '../../../generated/prisma/enums.js'

export class DepositDto {
  @IsEnum(CurrencyEnum)
  currency!: CurrencyEnum

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(50000)
  amount!: number

  @IsString()
  @IsOptional()
  description?: string
}
