import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { DepositInterface } from "../interfaces/wallet.interface";
import { UNIT_OF_WORK } from "./ports/unit-of-work.port";
import type { UnitOfWork } from "./ports/unit-of-work.port";
import { toMoney } from "./to-money";

@Injectable()
export class DepositService {
  constructor(@Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork) {}

  async execute({ userId, currency, amount, description }: DepositInterface) {
    const money = toMoney(amount, currency);

    return this.unitOfWork.run(async ({ wallets, transactions, outbox }) => {
      const wallet = await wallets.findOrCreateEmpty(userId, currency);

      const applied = await wallets.credit(wallet.id, wallet.version, money);
      if (!applied) {
        throw new ConflictException("Optimistic lock conflict");
      }

      const transaction = await transactions.create({
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: money,
        description: description ?? `Depósito ${currency}`,
      });

      // Same transaction as the balance change: the event exists if and only
      // if the deposit does. Delivery happens later, outside the request.
      await outbox.enqueue({
        type: "deposit.confirmed",
        walletId: wallet.id,
        data: {
          walletId: wallet.id,
          userId,
          amount,
          currency,
          transactionId: transaction.id,
        },
      });

      return transaction;
    });
  }
}
