import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ExchangeInterface } from "./interfaces/wallet.interface";
import { Prisma } from "../../generated/prisma/client.js";
import { withOptimisticRetry } from "./utils/with-optimistic-retry";
import { validateCurrencyPrecision } from "./utils/validate-currency-precision";
import { envs } from "../../config/envs";
import { assertFound } from "../../common/utils/assert-found";

@Injectable()
export class ExchangeService {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, fromCurrency, toCurrency, amount }: ExchangeInterface) {
    if (fromCurrency === toCurrency) {
      throw new BadRequestException(
        "Source and destination currency must differ",
      );
    }

    const decimalAmount = new Prisma.Decimal(amount);
    validateCurrencyPrecision(fromCurrency, decimalAmount);

    return withOptimisticRetry(this.prisma, async (tx) => {
      const [sourceWallet, targetWallet, exchangeRate] = await Promise.all([
        tx.wallet.findUnique({
          where: { userId_currency: { userId, currency: fromCurrency } },
        }),
        tx.wallet.findUnique({
          where: { userId_currency: { userId, currency: toCurrency } },
        }),
        tx.exchangeRate.findFirst({
          where: { fromCurrency, toCurrency },
          orderBy: { date: "desc" },
        }),
      ]);

      assertFound(sourceWallet, `Wallet ${fromCurrency}`);
      assertFound(targetWallet, `Wallet ${toCurrency}`);
      assertFound(exchangeRate, `Exchange rate ${fromCurrency}/${toCurrency}`);

      const rateAge =
        Date.now() - new Date(exchangeRate.date).getTime();
      if (rateAge > envs.EXCHANGE_RATE_MAX_AGE_MS) {
        throw new UnprocessableEntityException(
          `Exchange rate for ${fromCurrency}/${toCurrency} is stale. Please retry.`,
        );
      }

      if (sourceWallet.balance.lessThan(decimalAmount)) {
        throw new UnprocessableEntityException("Insufficient balance");
      }

      const rate = new Prisma.Decimal(exchangeRate.rate);
      const received = decimalAmount.times(rate);

      const sourceUpdate = tx.wallet.updateMany({
        where: { id: sourceWallet.id, version: sourceWallet.version },
        data: {
          balance: { decrement: decimalAmount },
          version: { increment: 1 },
        },
      });

      const targetUpdate = tx.wallet.updateMany({
        where: { id: targetWallet.id, version: targetWallet.version },
        data: {
          balance: { increment: received },
          version: { increment: 1 },
        },
      });

      const [sourceResult, targetResult] = await Promise.all([
        sourceUpdate,
        targetUpdate,
      ]);

      if (sourceResult.count === 0 || targetResult.count === 0) {
        throw new ConflictException("Optimistic lock conflict");
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          type: "EXCHANGE",
          amount: decimalAmount,
          currency: fromCurrency,
          status: "COMPLETED",
          description: `Conversión ${fromCurrency} → ${toCurrency}`,
          metadata: { rate: rate.toString(), received: received.toString(), toCurrency },
        },
      });

      return { ...transaction, received, rate, toCurrency };
    });
  }
}
