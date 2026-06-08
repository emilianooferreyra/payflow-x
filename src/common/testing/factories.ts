import {
  UserStatusEnum,
  AuthProviderEnum,
} from "../../generated/prisma/enums.js";

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
    userAgent: string | null;
    ipAddress: string | null;
    location: string | null;
    isActive: boolean;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  userId: uniqueId(),
  refreshToken: "hashed-refresh-token",
  userAgent: null,
  ipAddress: null,
  location: null,
  isActive: true,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  lastUsedAt: new Date(),
  ...overrides,
});

export const makeWallet = (
  overrides: Partial<{
    id: string;
    userId: string;
    currency: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) => ({
  id: uniqueId(),
  userId: uniqueId(),
  currency: "ARS",
  balance: 10000,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
