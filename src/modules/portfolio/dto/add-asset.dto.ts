import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MaxLength,
} from "class-validator";
import { AssetTypeEnum } from "../../../generated/prisma/enums.js";

export class AddAssetDto {
  @IsString()
  @MaxLength(20)
  symbol!: string;

  @IsEnum(AssetTypeEnum)
  type!: AssetTypeEnum;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  avgBuyPrice!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
