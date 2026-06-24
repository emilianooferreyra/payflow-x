import {
  AuthProviderEnum,
  UserStatusEnum,
} from "../../../generated/prisma/enums.js";

export interface CreateUserInterface {
  name?: string;
  lastName?: string;
  avatar?: string;
  email: string;
  backupEmail?: string;
  phone?: string;
  password?: string;
  country?: string;
  language?: string;

  emailConfirm?: boolean;
  backupEmailConfirm?: boolean;
  phoneConfirm?: boolean;

  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;

  status?: UserStatusEnum;
  authProvider?: AuthProviderEnum;
}

export type UpdateUserInterface = Partial<Omit<CreateUserInterface, "password">> & {
  id: string;
  password?: string;
};

export interface GetUserInterface {
  id?: string;
  email?: string;
}
