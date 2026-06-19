import { BadRequestException } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client.js";
import { getDecimalPlaces, isCurrencyEnum } from "./get-decimal-places";

export function validateCurrencyPrecision(
  currency: string,
  amount: Prisma.Decimal,
): void {
  if (!isCurrencyEnum(currency)) {
    throw new BadRequestException(`Unsupported currency: ${currency}`);
  }

  const maxDecimals = getDecimalPlaces(currency);
  const decimalPlaces = amount.decimalPlaces();
  if (decimalPlaces > maxDecimals) {
    throw new BadRequestException(
      `${currency} supports at most ${maxDecimals} decimal places`,
    );
  }
}
