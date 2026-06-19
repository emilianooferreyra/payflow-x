import {
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { DepositInterface } from "./interfaces/wallet.interface";
import { Prisma } from "../../generated/prisma/client.js";
import { withOptimisticRetry } from "./utils/with-optimistic-retry";
import { validateCurrencyPrecision } from "./utils/validate-currency-precision";

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async execute({ userId, currency, amount, description }: DepositInterface) {
    const decimalAmount = new Prisma.Decimal(amount);
    validateCurrencyPrecision(currency, decimalAmount);

    const transaction = await withOptimisticRetry(this.prisma, async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, currency, balance: 0, version: 1 },
        });
      }

      const { count } = await tx.wallet.updateMany({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: { increment: decimalAmount },
          version: { increment: 1 },
        },
      });

      if (count === 0) {
        throw new ConflictException("Optimistic lock conflict");
      }

      return tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: decimalAmount,
          currency,
          status: "COMPLETED",
          description: description ?? `Depósito ${currency}`,
        },
      });
    });

    await this.webhookService
      .dispatch({
        type: "deposit.confirmed",
        data: {
          walletId: transaction.walletId,
          userId,
          amount,
          currency,
          transactionId: transaction.id,
        },
      })
      .catch((err) =>
        this.logger.warn(
          `Webhook dispatch failed for deposit ${transaction.id}: ${err.message}`,
        ),
      );

    return transaction;
  }
}
