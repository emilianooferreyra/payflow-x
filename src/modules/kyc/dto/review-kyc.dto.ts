import { IsIn, IsString } from "class-validator";

export class ReviewKycDto {
  @IsString()
  @IsIn(["approve", "reject"])
  action!: "approve" | "reject";
}
