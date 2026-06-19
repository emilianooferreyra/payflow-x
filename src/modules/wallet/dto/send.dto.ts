import { IsString, Matches } from "class-validator";
import { AMOUNT_PATTERN } from "./amount.dto";

export class SendDto {
  @IsString()
  beneficiaryId!: string;

  @IsString()
  @Matches(AMOUNT_PATTERN, { message: "amount must be a positive decimal string" })
  amount!: string;
}
