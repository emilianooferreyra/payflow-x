import { IsIn, IsString } from "class-validator";
import type { DocumentType } from "../kyc.types";

export class SubmitKycDto {
  @IsString()
  @IsIn(["DNI", "PASSPORT", "DRIVER_LICENSE"])
  documentType!: DocumentType;
}
