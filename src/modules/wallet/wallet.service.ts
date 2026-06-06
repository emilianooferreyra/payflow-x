import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { DepositInterface, ExchangeInterface, WithdrawInterface } from './interfaces/wallet.interface'

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { currency: 'asc' },
    })
  }

  async deposit({ userId, currency, amount, description }: DepositInterface) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      })

      if (!wallet) throw new NotFoundException(`Wallet ${currency} not found`)

      const [transaction] = await Promise.all([
        tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEPOSIT',
            amount,
            currency,
            status: 'COMPLETED',
            description: description ?? `Depósito ${currency}`,
          },
        }),
        tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        }),
      ])

      return transaction
    })
  }

  async withdraw({ userId, currency, amount, description }: WithdrawInterface) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      })

      if (!wallet) throw new NotFoundException(`Wallet ${currency} not found`)
      if (Number(wallet.balance) < amount) {
        throw new UnprocessableEntityException('Insufficient balance')
      }

      const [transaction] = await Promise.all([
        tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'WITHDRAWAL',
            amount,
            currency,
            status: 'COMPLETED',
            description: description ?? `Retiro ${currency}`,
          },
        }),
        tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } },
        }),
      ])

      return transaction
    })
  }

  async exchange({ userId, fromCurrency, toCurrency, amount }: ExchangeInterface) {
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Source and destination currency must differ')
    }

    return this.prisma.$transaction(async (tx) => {
      const [sourceWallet, targetWallet, exchangeRate] = await Promise.all([
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: fromCurrency } } }),
        tx.wallet.findUnique({ where: { userId_currency: { userId, currency: toCurrency } } }),
        tx.exchangeRate.findFirst({
          where: { fromCurrency, toCurrency },
          orderBy: { date: 'desc' },
        }),
      ])

      if (!sourceWallet) throw new NotFoundException(`Wallet ${fromCurrency} not found`)
      if (!targetWallet) throw new NotFoundException(`Wallet ${toCurrency} not found`)
      if (!exchangeRate) throw new NotFoundException(`Exchange rate ${fromCurrency}/${toCurrency} not available`)
      if (Number(sourceWallet.balance) < amount) {
        throw new UnprocessableEntityException('Insufficient balance')
      }

      const rate = Number(exchangeRate.rate)
      const received = parseFloat((amount * rate).toFixed(2))

      const [transaction] = await Promise.all([
        tx.transaction.create({
          data: {
            walletId: sourceWallet.id,
            toWalletId: targetWallet.id,
            type: 'EXCHANGE',
            amount,
            currency: fromCurrency,
            status: 'COMPLETED',
            description: `Conversión ${fromCurrency} → ${toCurrency}`,
            metadata: { rate, received, toCurrency },
          },
        }),
        tx.wallet.update({
          where: { id: sourceWallet.id },
          data: { balance: { decrement: amount } },
        }),
        tx.wallet.update({
          where: { id: targetWallet.id },
          data: { balance: { increment: received } },
        }),
      ])

      return { ...transaction, received, rate, toCurrency }
    })
  }
}
