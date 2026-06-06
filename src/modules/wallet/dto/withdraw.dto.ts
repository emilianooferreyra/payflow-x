import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator'
import { CurrencyEnum } from '../../../generated/prisma/enums'

export class WithdrawDto {
  @IsEnum(CurrencyEnum)
  currency!: CurrencyEnum

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number

  @IsString()
  @IsOptional()
  description?: string
}
