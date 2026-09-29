import Decimal from "decimal.js";

/**
 * Domain currency codes. Intentionally NOT imported from
 * `generated/prisma/enums` — the whole point of this value object is that the
 * domain does not know Prisma exists. Keep this list in sync with
 * `CurrencyEnum` in prisma/schema.prisma by hand; a mismatch would only ever
 * be caught by the type checker at the persistence boundary, never silently.
 */
export type Currency = "ARS" | "USD" | "USDT" | "BRL";

const CURRENCY_DECIMALS: Record<Currency, number> = {
  ARS: 2,
  USD: 2,
  USDT: 6,
  BRL: 2,
};

/**
 * Plain decimal notation only: optional leading minus, digits, optional
 * fractional part. Scientific notation ("1e400") is never valid input for a
 * monetary amount — accepting it would let a client express a balance no
 * real currency can hold, and decimal.js's arbitrary precision means it would
 * otherwise parse without complaint.
 */
const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;

/** Same shape as an amount, but never negative — a conversion rate. */
const RATE_PATTERN = /^\d+(\.\d+)?$/;

export class InvalidAmountError extends Error {
  constructor(raw: string) {
    super(`"${raw}" is not a valid monetary amount`);
    this.name = "InvalidAmountError";
  }
}

export class PrecisionError extends Error {
  constructor(currency: Currency, maxDecimals: number, raw: string) {
    super(
      `${currency} supports at most ${maxDecimals} decimal place${maxDecimals === 1 ? "" : "s"}, got "${raw}"`,
    );
    this.name = "PrecisionError";
  }
}

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Cannot operate on different currencies: ${a} and ${b}`);
    this.name = "CurrencyMismatchError";
  }
}

function parseRate(raw: string): Decimal {
  if (!RATE_PATTERN.test(raw)) {
    throw new InvalidAmountError(raw);
  }

  const rate = new Decimal(raw);
  if (rate.lessThanOrEqualTo(0)) {
    throw new InvalidAmountError(raw);
  }

  return rate;
}

/**
 * A monetary amount and its currency, inseparable. The constructor is
 * private, so the only way to obtain a Money is through `of` or `zero` —
 * there is no path that skips validation, and no way to end up holding an
 * amount with more decimal places than its currency allows.
 */
export class Money {
  private constructor(
    private readonly amount: Decimal,
    private readonly currency: Currency,
  ) {}

  static of(rawAmount: string, currency: Currency): Money {
    if (!AMOUNT_PATTERN.test(rawAmount)) {
      throw new InvalidAmountError(rawAmount);
    }

    const amount = new Decimal(rawAmount);
    const maxDecimals = CURRENCY_DECIMALS[currency];

    if (amount.decimalPlaces() > maxDecimals) {
      throw new PrecisionError(currency, maxDecimals, rawAmount);
    }

    return new Money(amount, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(new Decimal(0), currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  /**
   * Converts to another currency at `rawRate`, truncating — never
   * rounding — to the target currency's precision. Rounding half-up would
   * manufacture a fraction of a cent that was never actually exchanged;
   * truncation only ever discards value, so the two books involved in a
   * conversion can never be credited more than the source amount justifies.
   */
  convertTo(targetCurrency: Currency, rawRate: string): Money {
    if (targetCurrency === this.currency) {
      throw new CurrencyMismatchError(this.currency, targetCurrency);
    }

    const rate = parseRate(rawRate);
    const targetDecimals = CURRENCY_DECIMALS[targetCurrency];
    const converted = this.amount
      .times(rate)
      .toDecimalPlaces(targetDecimals, Decimal.ROUND_DOWN);

    return new Money(converted, targetCurrency);
  }

  /** Same value, ordering across currencies is not meaningful. */
  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  getCurrency(): Currency {
    return this.currency;
  }

  toString(): string {
    return this.amount.toFixed(CURRENCY_DECIMALS[this.currency]);
  }
}
