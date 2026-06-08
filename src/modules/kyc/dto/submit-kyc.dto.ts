import { IsIn, IsString } from "class-validator";

export class SubmitKycDto {
  @IsString()
  @IsIn(["DNI", "PASSPORT", "DRIVER_LICENSE"])
  documentType!: string;
}
