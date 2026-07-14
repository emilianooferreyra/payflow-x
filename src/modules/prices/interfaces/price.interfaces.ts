export interface PriceResult {
  symbol: string;
  price: number | null;
  source: "FINNHUB" | "COINGECKO";
  currency: string;
  timestamp: string;
}
