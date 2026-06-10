import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";
import { WebhookModule } from "../webhook/webhook.module";
import { IdempotencyGuard } from "../../common/guards/idempotency.guard";

@Module({
  imports: [PrismaModule, KycModule, WebhookModule],
  controllers: [WalletController],
  providers: [WalletService, IdempotencyGuard],
  exports: [WalletService],
})
export class WalletModule {}
