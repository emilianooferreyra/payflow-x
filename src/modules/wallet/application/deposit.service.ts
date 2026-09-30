import { ConflictException, Inject, Injectable, Logger } from "@nestjs/common";
import { WebhookService } from "../../webhook/webhook.service";
import { DepositInterface } from "../interfaces/wallet.interface";
import { UNIT_OF_WORK } from "./ports/unit-of-work.port";
import type { UnitOfWork } from "./ports/unit-of-work.port";
import { toMoney } from "./to-money";

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    private readonly webhookService: WebhookService,
  ) {}

  async execute({ userId, currency, amount, description }: DepositInterface) {
    const money = toMoney(amount, currency);

    const transaction = await this.unitOfWork.run(
      async ({ wallets, transactions }) => {
        const wallet = await wallets.findOrCreateEmpty(userId, currency);

        const applied = await wallets.credit(wallet.id, wallet.version, money);
        if (!applied) {
          throw new ConflictException("Optimistic lock conflict");
        }

        return transactions.create({
          walletId: wallet.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: money,
          description: description ?? `Depósito ${currency}`,
        });
      },
    );

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
      .catch((err: Error) =>
        this.logger.warn(
          `Webhook dispatch failed for deposit ${transaction.id}: ${err.message}`,
        ),
      );

    return transaction;
  }
}
