import { AuthorizationTokenEnum } from "../../../commom/enums/authorization-token.enum";

export interface CreateTokenInterface {
  userId: string;
  type: AuthorizationTokenEnum;
  ttl?: number;
}

export interface PayloadTokenInterface {
  userId: string;
  type: AuthorizationTokenEnum;
  token: string;
}

export interface RevokeTokenInterface {
  userId: string;
  type: AuthorizationTokenEnum;
}

export interface TokenResponseInterface {
  token: string;
}
