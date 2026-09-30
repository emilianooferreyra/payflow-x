import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from "@nestjs/common";
import { assertFound } from "../../../common/utils/assert-found";
import { WebhookService } from "../../webhook/webhook.service";
import { WithdrawInterface } from "../interfaces/wallet.interface";
import { UNIT_OF_WORK } from "./ports/unit-of-work.port";
import type { UnitOfWork } from "./ports/unit-of-work.port";
import { toMoney } from "./to-money";

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);

  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    private readonly webhookService: WebhookService,
  ) {}

  async execute({ userId, currency, amount, description }: WithdrawInterface) {
    const money = toMoney(amount, currency);

    const transaction = await this.unitOfWork.run(
      async ({ wallets, transactions }) => {
        const wallet = await wallets.findByUserAndCurrency(userId, currency);

        assertFound(wallet, `Wallet ${currency}`);

        if (wallet.balance.isLessThan(money)) {
          throw new UnprocessableEntityException("Insufficient balance");
        }

        const applied = await wallets.debit(wallet.id, wallet.version, money);
        if (!applied) {
          throw new ConflictException("Optimistic lock conflict");
        }

        return transactions.create({
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          amount: money,
          description: description ?? `Retiro ${currency}`,
        });
      },
    );

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
      .catch((err: Error) =>
        this.logger.warn(
          `Webhook dispatch failed for withdrawal ${transaction.id}: ${err.message}`,
        ),
      );

    return transaction;
  }
}
