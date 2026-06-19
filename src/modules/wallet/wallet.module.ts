import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { DepositService } from "./deposit.service";
import { WithdrawService } from "./withdraw.service";
import { ExchangeService } from "./exchange.service";
import { SendService } from "./send.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";
import { WebhookModule } from "../webhook/webhook.module";
import { IdempotencyGuard } from "../../common/guards/idempotency.guard";

@Module({
  imports: [PrismaModule, KycModule, WebhookModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    DepositService,
    WithdrawService,
    ExchangeService,
    SendService,
    IdempotencyGuard,
  ],
  exports: [WalletService],
})
export class WalletModule {}
