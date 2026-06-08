import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GetTransactionsInterface } from "./interfaces/transaction.interface";

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({
    userId,
    page,
    limit,
    type,
    currency,
    dateFrom,
    dateTo,
  }: GetTransactionsInterface) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      select: { id: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const skip = (page - 1) * limit;

    const where = {
      walletId: { in: walletIds },
      type,
      currency,
      createdAt:
        dateFrom || dateTo
          ? {
              gte: dateFrom ? new Date(dateFrom) : undefined,
              lte: dateTo ? new Date(dateTo) : undefined,
            }
          : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          wallet: { select: { currency: true } },
          toWallet: { select: { currency: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      select: { id: true },
    });

    const walletIds = wallets.map((w) => w.id);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id, walletId: { in: walletIds } },
      include: {
        wallet: { select: { currency: true } },
        toWallet: { select: { currency: true } },
      },
    });

    if (!transaction) throw new NotFoundException("Transaction not found");

    return transaction;
  }
}
