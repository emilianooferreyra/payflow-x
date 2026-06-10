import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./modules/prisma/prisma.module";
import KeyvRedis from "@keyv/redis";
import { envs } from "./config";
import { UsersModule } from "./modules/users/users.module";
import { TestModule } from "./modules/test/test.module";
import { HashModule } from "./modules/hash/hash.module";
import { SessionModule } from "./modules/session/session.module";
import { TokensModule } from "./modules/tokens/tokens.module";
import { EmailsModule } from "./modules/emails/emails.module";
import { AuthModule } from "./modules/auth/auth.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { TransactionModule } from "./modules/transaction/transaction.module";
import { InvestmentModule } from "./modules/investment/investment.module";
import { CardModule } from "./modules/card/card.module";
import { ExchangeRateModule } from "./modules/exchange-rate/exchange-rate.module";
import { KycModule } from "./modules/kyc/kyc.module";
import { WebhookModule } from "./modules/webhook/webhook.module";
import { BeneficiariesModule } from "./modules/beneficiaries/beneficiaries.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: 5000,
        stores: [new KeyvRedis(envs.REDIS_URL)],
      }),
    }),
    PrismaModule,
    UsersModule,
    TestModule,
    HashModule,
    SessionModule,
    TokensModule,
    EmailsModule,
    AuthModule,
    WalletModule,
    TransactionModule,
    InvestmentModule,
    CardModule,
    ExchangeRateModule,
    KycModule,
    WebhookModule,
    BeneficiariesModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
