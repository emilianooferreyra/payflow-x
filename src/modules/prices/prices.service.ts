import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { envs } from "../../config";
import { CRYPTO_SYMBOL_MAP } from "./crypto-symbols";
import { PriceResult } from "./interfaces/price.interfaces";

const PRICE_TTL_MS = 300_000;

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getPrice(symbol: string): Promise<PriceResult | null> {
    const upper = symbol.toUpperCase();
    const cacheKey = `price:${upper}`;

    try {
      const cached = await this.cache.get<PriceResult>(cacheKey);
      if (cached) return cached;
    } catch {
      this.logger.warn(`Redis unavailable for key ${cacheKey}, fetching directly`);
    }

    const result = CRYPTO_SYMBOL_MAP[upper]
      ? await this.fetchCoinGecko(upper, CRYPTO_SYMBOL_MAP[upper])
      : await this.fetchFinnhub(upper);

    if (result) {
      try {
        await this.cache.set(cacheKey, result, PRICE_TTL_MS);
      } catch {
        this.logger.warn(`Failed to cache price for ${upper}`);
      }
    }

    return result;
  }

  async getPrices(symbols: string[]): Promise<(PriceResult | null)[]> {
    return Promise.all(symbols.map((s) => this.getPrice(s).catch(() => null)));
  }

  private async fetchFinnhub(symbol: string): Promise<PriceResult | null> {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${envs.FINNHUB_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as { c: number };
      if (!data.c) return null;
      return {
        symbol,
        price: data.c,
        source: "FINNHUB",
        currency: "USD",
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Finnhub fetch failed for ${symbol}`, err);
      return null;
    }
  }

  private async fetchCoinGecko(symbol: string, coinId: string): Promise<PriceResult | null> {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, { usd: number }>;
      const price = data[coinId]?.usd;
      if (price == null) return null;
      return {
        symbol,
        price,
        source: "COINGECKO",
        currency: "USD",
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`CoinGecko fetch failed for ${symbol} (coinId: ${coinId})`, err);
      return null;
    }
  }
}
