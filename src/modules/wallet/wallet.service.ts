import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookService } from "../webhook/webhook.service";
import {
  DepositInterface,
  ExchangeInterface,
  SendInterface,
  WithdrawInterface,
} from "./interfaces/wallet.interface";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
  ) {}

  async getWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { currency: "asc" },
    });
  }

  async deposit({ userId, currency, amount, description }: DepositInterface) {
    let transaction: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        transaction = await this.prisma.$transaction(async (tx) => {
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
              balance: { increment: amount },
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
              amount,
              currency,
              status: "COMPLETED",
              description: description ?? `Depósito ${currency}`,
            },
          });
        });

        break; // transaction committed, exit retry loop
      } catch (error) {
        if (
          error instanceof ConflictException &&
          attempt < this.MAX_RETRIES - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    // Fire webhook AFTER transaction commits (outside the tx to avoid blocking it)
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

  async withdraw({ userId, currency, amount, description }: WithdrawInterface) {
    let transaction: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        transaction = await this.prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({
            where: { userId_currency: { userId, currency } },
          });

          if (!wallet)
            throw new NotFoundException(`Wallet ${currency} not found`);

          if (Number(wallet.balance) < amount) {
            throw new UnprocessableEntityException("Insufficient balance");
          }

          const { count } = await tx.wallet.updateMany({
            where: { id: wallet.id, version: wallet.version },
            data: {
              balance: { decrement: amount },
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
              amount,
              currency,
              status: "COMPLETED",
              description: description ?? `Retiro ${currency}`,
            },
          });
        });

        break; // transaction committed, exit retry loop
      } catch (error) {
        if (
          error instanceof ConflictException &&
          attempt < this.MAX_RETRIES - 1
        ) {
          continue;
        }
        if (error instanceof UnprocessableEntityException) throw error;
        if (error instanceof NotFoundException) throw error;
        throw error;
      }
    }

    if (!transaction) {
      throw new Error("Unreachable");
    }

    // Fire webhook AFTER transaction commits (outside the tx to avoid blocking it)
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

  async exchange({
    userId,
    fromCurrency,
    toCurrency,
    amount,
  }: ExchangeInterface) {
    if (fromCurrency === toCurrency) {
      throw new BadRequestException(
        "Source and destination currency must differ",
      );
    }

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
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

          if (!sourceWallet)
            throw new NotFoundException(`Wallet ${fromCurrency} not found`);
          if (!targetWallet)
            throw new NotFoundException(`Wallet ${toCurrency} not found`);
          if (!exchangeRate)
            throw new NotFoundException(
              `Exchange rate ${fromCurrency}/${toCurrency} not available`,
            );
          if (Number(sourceWallet.balance) < amount) {
            throw new UnprocessableEntityException("Insufficient balance");
          }

          const rate = Number(exchangeRate.rate);
          const received = parseFloat((amount * rate).toFixed(2));

          const sourceUpdate = tx.wallet.updateMany({
            where: { id: sourceWallet.id, version: sourceWallet.version },
            data: {
              balance: { decrement: amount },
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
              amount,
              currency: fromCurrency,
              status: "COMPLETED",
              description: `Conversión ${fromCurrency} → ${toCurrency}`,
              metadata: { rate, received, toCurrency },
            },
          });

          return { ...transaction, received, rate, toCurrency };
        });
      } catch (error) {
        if (
          error instanceof ConflictException &&
          attempt < this.MAX_RETRIES - 1
        ) {
          continue;
        }
        if (error instanceof UnprocessableEntityException) throw error;
        if (error instanceof NotFoundException) throw error;
        if (error instanceof BadRequestException) throw error;
        throw error;
      }
    }

    throw new Error("Unreachable");
  }

  async send({ userId, beneficiaryId, amount }: SendInterface) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id: beneficiaryId, userId, isActive: true },
    });

    if (!beneficiary) {
      throw new NotFoundException("Beneficiary not found");
    }

    let transaction: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        transaction = await this.prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({
            where: {
              userId_currency: { userId, currency: beneficiary.currency },
            },
          });

          if (!wallet)
            throw new NotFoundException(
              `Wallet ${beneficiary.currency} not found`,
            );
          if (Number(wallet.balance) < amount) {
            throw new UnprocessableEntityException("Insufficient balance");
          }

          const { count } = await tx.wallet.updateMany({
            where: { id: wallet.id, version: wallet.version },
            data: {
              balance: { decrement: amount },
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
              amount,
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

        break;
      } catch (error) {
        if (
          error instanceof ConflictException &&
          attempt < this.MAX_RETRIES - 1
        ) {
          continue;
        }
        if (error instanceof UnprocessableEntityException) throw error;
        if (error instanceof NotFoundException) throw error;
        throw error;
      }
    }

    if (!transaction) {
      throw new Error("Unreachable");
    }

    await this.webhookService
      .dispatch({
        type: "withdraw.completed",
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
