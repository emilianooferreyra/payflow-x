import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import { SendInterface } from "./interfaces/wallet.interface";
import { Prisma } from "../../generated/prisma/client.js";
import { withOptimisticRetry } from "./utils/with-optimistic-retry";
import { validateCurrencyPrecision } from "./utils/validate-currency-precision";
import { assertFound } from "../../common/utils/assert-found";

@Injectable()
export class SendService {
  private readonly logger = new Logger(SendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async execute({ userId, beneficiaryId, amount }: SendInterface) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, userId, isActive: true },
    });

    assertFound(beneficiary, "Beneficiary");

    const decimalAmount = new Prisma.Decimal(amount);
    validateCurrencyPrecision(beneficiary.currency, decimalAmount);

    const transaction = await withOptimisticRetry(this.prisma, async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId_currency: { userId, currency: beneficiary.currency },
        },
      });

      assertFound(wallet, `Wallet ${beneficiary.currency}`);

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
          type: "TRANSFER",
          amount: decimalAmount,
          currency: beneficiary.currency,
          status: "COMPLETED",
          description: `Envío a ${beneficiary.alias}`,
          metadata: {
            beneficiaryId: beneficiary.id,
            beneficiaryAlias: beneficiary.alias,
            beneficiaryType: beneficiary.beneficiaryType,
            accountNumber: beneficiary.accountNumber,
            bankName: beneficiary.bankName,
          },
        },
      });
    });

    await this.webhookService
      .dispatch({
        type: "transfer.completed",
        data: {
          walletId: transaction.walletId,
          userId,
          amount,
          currency: beneficiary.currency,
          transactionId: transaction.id,
        },
      })
      .catch((err) =>
        this.logger.warn(
          `Webhook dispatch failed for send ${transaction.id}: ${err.message}`,
        ),
      );

    return transaction;
  }
}
