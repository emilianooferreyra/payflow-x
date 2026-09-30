import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { WithdrawInterface } from "./interfaces/wallet.interface";
import { Prisma } from "../../generated/prisma/client.js";
import { withOptimisticRetry } from "./utils/with-optimistic-retry";
import { validateCurrencyPrecision } from "./utils/validate-currency-precision";
import { assertFound } from "../../common/utils/assert-found";

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async execute({ userId, currency, amount, description }: WithdrawInterface) {
    const decimalAmount = new Prisma.Decimal(amount);
    validateCurrencyPrecision(currency, decimalAmount);

    const transaction = await withOptimisticRetry(this.prisma, async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });

      assertFound(wallet, `Wallet ${currency}`);

      if (wallet.balance.lessThan(decimalAmount)) {
        throw new UnprocessableEntityException("Insufficient balance");
      }

      const { count } = await tx.wallet.updateMany({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: { decrement: decimalAmount },
          version: { increment: 1 },
        },
      });

      if (count === 0) {
        throw new ConflictException("Optimistic lock conflict");
      }

      return tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: decimalAmount,
          currency,
          status: "COMPLETED",
          description: description ?? `Retiro ${currency}`,
        },
      });
    });

    await this.webhookService
      .dispatch({
        type: "withdraw.completed",
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
          `Webhook dispatch failed for withdrawal ${transaction.id}: ${err.message}`,
        ),
      );

    return transaction;
  }
}
