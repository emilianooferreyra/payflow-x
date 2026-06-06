import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { BuyAssetInterface, SellAssetInterface } from './interfaces/investment.interface'

@Injectable()
export class InvestmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssets() {
    return this.prisma.asset.findMany({
      orderBy: { symbol: 'asc' },
    })
  }

  async getPortfolio(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { createdAt: 'asc' },
    })

    const totalValue = investments.reduce((sum, inv) => sum + Number(inv.currentValue), 0)
    const totalCost = investments.reduce(
      (sum, inv) => sum + Number(inv.avgBuyPrice) * Number(inv.quantity),
      0,
    )

    return {
      investments,
      summary: {
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalPnL: parseFloat((totalValue - totalCost).toFixed(2)),
        totalPnLPercent: totalCost > 0
          ? parseFloat((((totalValue - totalCost) / totalCost) * 100).toFixed(2))
          : 0,
      },
    }
  }

  async buy({ userId, assetId, amount }: BuyAssetInterface) {
    return this.prisma.$transaction(async (tx) => {
      const [asset, usdWallet] = await Promise.all([
        tx.asset.findUnique({ where: { id: assetId } }),
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: 'USD' } } }),
      ])

      if (!asset) throw new NotFoundException('Asset not found')
      if (!usdWallet) throw new NotFoundException('USD wallet not found')
      if (Number(usdWallet.balance) < amount) {
        throw new UnprocessableEntityException('Insufficient USD balance')
      }

      const price = Number(asset.currentPrice)
      const quantity = parseFloat((amount / price).toFixed(8))

      const existing = await tx.investment.findUnique({
        where: { userId_assetId: { userId, assetId } },
      })

      const investment = existing
        ? await tx.investment.update({
            where: { userId_assetId: { userId, assetId } },
            data: {
              quantity: { increment: quantity },
              avgBuyPrice: parseFloat(
                (
                  (Number(existing.quantity) * Number(existing.avgBuyPrice) + quantity * price) /
                  (Number(existing.quantity) + quantity)
                ).toFixed(2),
              ),
              currentValue: parseFloat(
                ((Number(existing.quantity) + quantity) * price).toFixed(2),
              ),
            },
            include: { asset: true },
          })
        : await tx.investment.create({
            data: {
              userId,
              assetId,
              quantity,
              avgBuyPrice: price,
              currentValue: parseFloat((quantity * price).toFixed(2)),
            },
            include: { asset: true },
          })

      await Promise.all([
        tx.transaction.create({
          data: {
            walletId: usdWallet.id,
            type: 'INVESTMENT_BUY',
            amount,
            currency: 'USD',
            status: 'COMPLETED',
            description: `Compra ${asset.symbol} — ${quantity} unidades`,
            category: 'INVESTMENT',
            metadata: { assetId, symbol: asset.symbol, quantity, price },
          },
        }),
        tx.wallet.update({
          where: { id: usdWallet.id },
          data: { balance: { decrement: amount } },
        }),
      ])

      return investment
    })
  }

  async sell({ userId, assetId, quantity }: SellAssetInterface) {
    return this.prisma.$transaction(async (tx) => {
      const [investment, usdWallet] = await Promise.all([
        tx.investment.findUnique({
          where: { userId_assetId: { userId, assetId } },
          include: { asset: true },
        }),
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: 'USD' } } }),
      ])

      if (!investment) throw new NotFoundException('Investment not found')
      if (!usdWallet) throw new NotFoundException('USD wallet not found')
      if (Number(investment.quantity) < quantity) {
        throw new UnprocessableEntityException('Insufficient quantity')
      }

      const price = Number(investment.asset.currentPrice)
      const proceeds = parseFloat((quantity * price).toFixed(2))
      const remainingQty = parseFloat((Number(investment.quantity) - quantity).toFixed(8))

      const updatedInvestment = remainingQty > 0
        ? await tx.investment.update({
            where: { userId_assetId: { userId, assetId } },
            data: {
              quantity: remainingQty,
              currentValue: parseFloat((remainingQty * price).toFixed(2)),
            },
            include: { asset: true },
          })
        : await tx.investment.delete({
            where: { userId_assetId: { userId, assetId } },
          })

      await Promise.all([
        tx.transaction.create({
          data: {
            walletId: usdWallet.id,
            type: 'INVESTMENT_SELL',
            amount: proceeds,
            currency: 'USD',
            status: 'COMPLETED',
            description: `Venta ${investment.asset.symbol} — ${quantity} unidades`,
            category: 'INVESTMENT',
            metadata: { assetId, symbol: investment.asset.symbol, quantity, price, proceeds },
          },
        }),
        tx.wallet.update({
          where: { id: usdWallet.id },
          data: { balance: { increment: proceeds } },
        }),
      ])

      return { investment: updatedInvestment, proceeds }
    })
  }
}
