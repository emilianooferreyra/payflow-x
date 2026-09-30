import { BadRequestException } from "@nestjs/common";
import {
  Currency,
  InvalidAmountError,
  Money,
  PrecisionError,
} from "../../../shared/kernel/money";

/**
 * Turns a client-supplied amount into Money, answering with the same 400 the
 * API gave before `Money` existed. Domain errors stay domain errors below this
 * line; only this boundary decides they are HTTP errors.
 */
export function toMoney(rawAmount: string, currency: Currency): Money {
  try {
    return Money.of(rawAmount, currency);
  } catch (error) {
    if (error instanceof PrecisionError) {
      throw new BadRequestException(
        `${error.currency} supports at most ${error.maxDecimals} decimal places`,
      );
    }
    if (error instanceof InvalidAmountError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
