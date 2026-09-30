import {
  CurrencyMismatchError,
  InvalidAmountError,
  Money,
  PrecisionError,
} from "./money";

describe("Money", () => {
  describe("construction", () => {
    it("keeps the amount exact — no binary floating point", () => {
      const sum = Money.of("0.1", "ARS").add(Money.of("0.2", "ARS"));

      expect(sum.toString()).toBe("0.30");
      expect(0.1 + 0.2).not.toBe(0.3); // the bug this type exists to prevent
    });

    it("formats at the precision of its currency", () => {
      expect(Money.of("100.5", "ARS").toString()).toBe("100.50");
      expect(Money.of("1", "USDT").toString()).toBe("1.000000");
    });

    it("rejects more decimal places than the currency allows", () => {
      expect(() => Money.of("10.123", "ARS")).toThrow(PrecisionError);
      expect(() => Money.of("10.1234567", "USDT")).toThrow(PrecisionError);
    });

    it("accepts the exact number of decimal places the currency allows", () => {
      expect(Money.of("10.12", "ARS").toString()).toBe("10.12");
      expect(Money.of("10.123456", "USDT").toString()).toBe("10.123456");
    });

    it("rejects values that are not finite numbers", () => {
      for (const bad of ["", " ", "abc", "1,5", "NaN", "Infinity", "1e400"]) {
        expect(() => Money.of(bad, "ARS")).toThrow(InvalidAmountError);
      }
    });

    it("builds a zero amount", () => {
      expect(Money.zero("USD").toString()).toBe("0.00");
      expect(Money.zero("USD").isZero()).toBe(true);
    });

    it("allows negative amounts — a ledger needs both directions", () => {
      const debit = Money.of("-50", "ARS");

      expect(debit.isNegative()).toBe(true);
      expect(debit.toString()).toBe("-50.00");
    });
  });

  describe("precision error details", () => {
    it("exposes the currency and the allowed decimals so callers can word their own message", () => {
      let caught: unknown;
      try {
        Money.of("10.123", "ARS");
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(PrecisionError);
      expect((caught as PrecisionError).currency).toBe("ARS");
      expect((caught as PrecisionError).maxDecimals).toBe(2);
    });
  });

  describe("restoring a stored value", () => {
    // A balance written before precision was enforced (for example the FX
    // rounding that left 1.0005 USD) must still be readable, or a wallet that
    // works today would start failing the moment it is loaded.
    it("keeps precision that Money.of would reject", () => {
      expect(() => Money.of("1.0005", "USD")).toThrow(PrecisionError);

      const legacy = Money.restore("1.0005", "USD");

      expect(legacy.isGreaterThanOrEqual(Money.of("1.00", "USD"))).toBe(true);
      expect(legacy.isLessThan(Money.of("1.01", "USD"))).toBe(true);
    });

    it("compares exactly, without rounding to the currency precision", () => {
      const legacy = Money.restore("1.0005", "USD");

      expect(legacy.isLessThan(Money.of("1.00", "USD"))).toBe(false);
      expect(
        Money.restore("1.004", "USD").isLessThan(Money.of("1.00", "USD")),
      ).toBe(false);
    });

    it("still rejects input that is not a plain decimal", () => {
      for (const bad of ["", "abc", "1e400", "NaN"]) {
        expect(() => Money.restore(bad, "USD")).toThrow(InvalidAmountError);
      }
    });
  });

  describe("arithmetic", () => {
    it("adds and subtracts within the same currency", () => {
      const balance = Money.of("1000.00", "ARS");

      expect(balance.add(Money.of("250.50", "ARS")).toString()).toBe("1250.50");
      expect(balance.subtract(Money.of("250.50", "ARS")).toString()).toBe(
        "749.50",
      );
    });

    it("refuses to add different currencies", () => {
      expect(() => Money.of("100", "USD").add(Money.of("100", "ARS"))).toThrow(
        CurrencyMismatchError,
      );
    });

    it("refuses to subtract different currencies", () => {
      expect(() =>
        Money.of("100", "USD").subtract(Money.of("100", "ARS")),
      ).toThrow(CurrencyMismatchError);
    });

    it("names both currencies in the mismatch error", () => {
      expect(() => Money.of("100", "USD").add(Money.of("100", "ARS"))).toThrow(
        /USD.*ARS|ARS.*USD/,
      );
    });

    it("never mutates either operand", () => {
      const a = Money.of("100.00", "ARS");
      const b = Money.of("50.00", "ARS");

      a.add(b);
      a.subtract(b);

      expect(a.toString()).toBe("100.00");
      expect(b.toString()).toBe("50.00");
    });
  });

  describe("comparison", () => {
    it("compares amounts of the same currency", () => {
      const hundred = Money.of("100.00", "ARS");

      expect(hundred.isLessThan(Money.of("100.01", "ARS"))).toBe(true);
      expect(hundred.isLessThan(Money.of("99.99", "ARS"))).toBe(false);
      expect(hundred.isGreaterThanOrEqual(Money.of("100.00", "ARS"))).toBe(
        true,
      );
      expect(hundred.equals(Money.of("100.00", "ARS"))).toBe(true);
    });

    it("refuses to compare different currencies", () => {
      expect(() =>
        Money.of("100", "USD").isLessThan(Money.of("100", "ARS")),
      ).toThrow(CurrencyMismatchError);
    });

    it("is not equal to the same amount in another currency", () => {
      expect(Money.of("100", "USD").equals(Money.of("100", "ARS"))).toBe(false);
    });
  });

  describe("conversion", () => {
    it("converts to another currency at a rate", () => {
      const pesos = Money.of("100000.00", "ARS");

      expect(pesos.convertTo("USD", "0.001").toString()).toBe("100.00");
    });

    it("truncates instead of rounding up — conversion never creates money", () => {
      // 10.005 USD at 2 decimals would round half-up to 10.01, inventing a cent.
      expect(
        Money.of("1000.50", "ARS").convertTo("USD", "0.01").toString(),
      ).toBe("10.00");
    });

    it("rejects a non-positive or malformed rate", () => {
      const pesos = Money.of("100", "ARS");

      for (const bad of ["0", "-1", "abc", ""]) {
        expect(() => pesos.convertTo("USD", bad)).toThrow(InvalidAmountError);
      }
    });

    it("refuses to convert a currency to itself", () => {
      expect(() => Money.of("100", "ARS").convertTo("ARS", "1")).toThrow(
        CurrencyMismatchError,
      );
    });
  });
});
