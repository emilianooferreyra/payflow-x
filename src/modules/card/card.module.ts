import { Module } from "@nestjs/common";
import { CardController } from "./card.controller";
import { CardService } from "./card.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";

@Module({
  imports: [PrismaModule, KycModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
