import { IsNumber, IsPositive, IsString, Max } from "class-validator";

export class SendDto {
  @IsString()
  beneficiaryId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(50000)
  amount!: number;
}
