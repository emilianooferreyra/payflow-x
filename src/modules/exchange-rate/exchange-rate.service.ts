import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CurrencyEnum } from "../../generated/prisma/enums";

const SUPPORTED_PAIRS: [CurrencyEnum, CurrencyEnum][] = [
  ["USD", "ARS"],
  ["ARS", "USD"],
  ["USD", "USDT"],
  ["USDT", "USD"],
  ["USDT", "ARS"],
  ["USD", "BRL"],
];

@Injectable()
export class ExchangeRateService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const rates = await Promise.all(
      SUPPORTED_PAIRS.map(([fromCurrency, toCurrency]) =>
        this.prisma.exchangeRate.findFirst({
          where: { fromCurrency, toCurrency },
          orderBy: { date: "desc" },
        }),
      ),
    );

    return rates.filter(Boolean).map((rate) => ({
      fromCurrency: rate!.fromCurrency,
      toCurrency: rate!.toCurrency,
      rate: Number(rate!.rate),
      date: rate!.date,
    }));
  }

  async getRate(fromCurrency: CurrencyEnum, toCurrency: CurrencyEnum) {
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrency, toCurrency },
      orderBy: { date: "desc" },
    });

    if (!rate)
      throw new NotFoundException(
        `Rate ${fromCurrency}/${toCurrency} not available`,
      );

    return {
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      date: rate.date,
    };
  }

  async getHistory(fromCurrency: CurrencyEnum, toCurrency: CurrencyEnum) {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { fromCurrency, toCurrency },
      orderBy: { date: "asc" },
      take: 30,
    });

    if (!rates.length)
      throw new NotFoundException(
        `No history for ${fromCurrency}/${toCurrency}`,
      );

    return rates.map((r) => ({
      rate: Number(r.rate),
      date: r.date,
    }));
  }

  async refresh() {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) return { message: "EXCHANGE_RATE_API_KEY not configured" };

    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    );
    const data = await res.json();

    const now = new Date();
    const pairs = [
      {
        fromCurrency: "USD" as CurrencyEnum,
        toCurrency: "ARS" as CurrencyEnum,
        rate: data.conversion_rates.ARS,
      },
      {
        fromCurrency: "ARS" as CurrencyEnum,
        toCurrency: "USD" as CurrencyEnum,
        rate: parseFloat((1 / data.conversion_rates.ARS).toFixed(8)),
      },
      {
        fromCurrency: "USD" as CurrencyEnum,
        toCurrency: "BRL" as CurrencyEnum,
        rate: data.conversion_rates.BRL,
      },
      {
        fromCurrency: "USD" as CurrencyEnum,
        toCurrency: "USDT" as CurrencyEnum,
        rate: 1.0002,
      },
      {
        fromCurrency: "USDT" as CurrencyEnum,
        toCurrency: "USD" as CurrencyEnum,
        rate: 0.9998,
      },
      {
        fromCurrency: "USDT" as CurrencyEnum,
        toCurrency: "ARS" as CurrencyEnum,
        rate: parseFloat((data.conversion_rates.ARS * 0.9998).toFixed(4)),
      },
    ];

    await this.prisma.exchangeRate.createMany({
      data: pairs.map((p) => ({ ...p, date: now })),
    });

    return { message: "Rates refreshed", pairs: pairs.length, date: now };
  }
}
