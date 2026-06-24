import {
  UserStatusEnum,
  AuthProviderEnum,
  TransactionTypeEnum,
  TransactionStatusEnum,
  BeneficiaryTypeEnum,
  CurrencyEnum,
} from "../../generated/prisma/enums.js";
import { Prisma } from "../../generated/prisma/client.js";

let counter = 0;
const uniqueId = (): string => `test-id-${++counter}-${Date.now()}`;

export const makeUser = (
  overrides: Partial<{
    id: string;
    name: string | null;
    lastName: string | null;
    avatar: string | null;
    email: string;
    backupEmail: string | null;
    phone: string | null;
    password: string | null;
    country: string | null;
    language: string | null;
    emailConfirm: boolean;
    backupEmailConfirm: boolean;
    phoneConfirm: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    status: string;
    authProvider: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  name: null,
  lastName: null,
  avatar: null,
  email: "test@example.com",
  backupEmail: null,
  phone: null,
  password: "hashed-password",
  country: "AR",
  language: "es-ES",
  emailConfirm: false,
  backupEmailConfirm: false,
  phoneConfirm: false,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  status: UserStatusEnum.DRAFT,
  authProvider: AuthProviderEnum.LOCAL,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const makeAdminUser = (overrides: Parameters<typeof makeUser>[0] = {}) =>
  makeUser({ status: UserStatusEnum.ACTIVE, ...overrides });

export const makeSession = (
  overrides: Partial<{
    id: string;
    userId: string;
    refreshToken: string;
    refreshTokenVersion: number;
    userAgent: string | null;
    ipAddress: string | null;
    location: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    lastUsedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  userId: uniqueId(),
  refreshToken: "hashed-refresh-token",
  refreshTokenVersion: 0,
  userAgent: null,
  ipAddress: null,
  location: null,
  isActive: true,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  lastUsedAt: new Date(),
  ...overrides,
});

export const makeBeneficiary = (
  overrides: Partial<{
    id: string;
    userId: string;
    alias: string;
    beneficiaryType: string;
    accountNumber: string;
    bankName: string | null;
    currency: string;
    country: string;
    documentType: string | null;
    documentNumber: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  userId: uniqueId(),
  alias: "Test Beneficiary",
  beneficiaryType: BeneficiaryTypeEnum.CBU,
  accountNumber: "1234567890123456789012",
  bankName: "Test Bank",
  currency: CurrencyEnum.ARS,
  country: "AR",
  documentType: null,
  documentNumber: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const makeTransaction = (
  overrides: Partial<{
    id: string;
    walletId: string;
    toWalletId: string | null;
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string | null;
    category: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  walletId: uniqueId(),
  toWalletId: null,
  type: TransactionTypeEnum.DEPOSIT,
  amount: 1000,
  currency: CurrencyEnum.ARS,
  status: TransactionStatusEnum.COMPLETED,
  description: null,
  category: null,
  metadata: null,
  createdAt: new Date(),
  ...overrides,
});

export const makeWallet = (
  overrides: Partial<{
    id: string;
    userId: string;
    currency: string;
    balance: number | Prisma.Decimal;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  userId: uniqueId(),
  currency: "ARS",
  balance: 10000,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
