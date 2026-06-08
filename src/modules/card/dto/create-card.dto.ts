import { IsEnum, IsOptional, IsString } from "class-validator";
import { CardTypeEnum } from "../../../generated/prisma/enums";

export class CreateCardDto {
  @IsEnum(CardTypeEnum)
  type!: CardTypeEnum;

  @IsString()
  maskedNumber!: string;

  @IsString()
  @IsOptional()
  network?: string;

  @IsString()
  @IsOptional()
  issuer?: string;
}
