import type { CreateUserInterface, UpdateUserInterface } from "../modules/users/interfaces/users.interface";
import type { WebhookService } from "../modules/webhook/webhook.service";
import { assertFound } from "../common/utils/assert-found";
import { isCurrencyEnum, getDecimalPlaces } from "../modules/wallet/utils/get-decimal-places";

type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

const _str_str: AssertEqual<string, string> = true;
const _union_union: AssertEqual<string | number, string | number> = true;
const _never_never: AssertEqual<never, never> = true;
// @ts-expect-error
const _union_str: AssertEqual<string | number, string> = true;

const _hello_string: string = (() => {
  const value: string | null = "hello";
  assertFound(value, "test");
  return value;
})();

const _some_user: { id: string } = (() => {
  const value: { id: string } | null | undefined = { id: "1" };
  assertFound(value, "user");
  return value;
})();

// @ts-expect-error
const _null_never: string = (() => {
  const value: null = null;
  assertFound(value, "test");
  return value;
})();

const _currency_enum: () => void = () => {
  const value: string = "USD";
  if (isCurrencyEnum(value)) {
    const _currency: import("../generated/prisma/enums").CurrencyEnum = value;
  } else {
    const _plain_string: string = value;
  }
};

const _decimal_places: number = (() => {
  const value: string = "USD";
  if (isCurrencyEnum(value)) {
    return getDecimalPlaces(value);
  }
  return 0;
})();

type _webhook = Parameters<typeof WebhookService.prototype.dispatch>[0];

const _deposit: _webhook = {
  type: "deposit.confirmed",
  data: { walletId: "w-1", userId: "u-1", amount: "500", currency: "USD", transactionId: "tx-1" },
};
const _withdraw: _webhook = {
  type: "withdraw.completed",
  data: { walletId: "w-1", userId: "u-1", amount: "500", currency: "USD", transactionId: "tx-1" },
};
const _transfer: _webhook = {
  type: "transfer.completed",
  data: { walletId: "w-1", userId: "u-1", amount: "500", currency: "USD", transactionId: "tx-1" },
};

// @ts-expect-error
const _bad_type: _webhook = { type: "transfer.cancelled", data: {} as any };

const _just_id: UpdateUserInterface = { id: "u-1" };
const _with_password: UpdateUserInterface = { id: "u-1", password: "new-pass" };
const _with_name: UpdateUserInterface = { id: "u-1", name: "John" };
const _email_password: CreateUserInterface = { email: "a@b.com", password: "secret" };

type _update_user = AssertEqual<
  UpdateUserInterface,
  { id: string; password?: string } & Partial<Omit<CreateUserInterface, "password">>
>;
const _update_user_shape: _update_user = true;
