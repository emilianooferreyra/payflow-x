import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [PrismaModule, KycModule, WebhookModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
