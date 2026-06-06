import { IsNumber, IsPositive, IsString, IsUUID } from 'class-validator'

export class SellAssetDto {
  @IsUUID()
  @IsString()
  assetId!: string

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  quantity!: number
}
