import { IsIn, IsString } from "class-validator";
import type { KycReviewAction } from "../kyc.types";

export class ReviewKycDto {
  @IsString()
  @IsIn(["approve", "reject"])
  action!: KycReviewAction;
}
