import { IsNumber, IsPositive, IsString, IsUUID } from "class-validator";

export class BuyAssetDto {
  @IsUUID()
  @IsString()
  assetId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}
