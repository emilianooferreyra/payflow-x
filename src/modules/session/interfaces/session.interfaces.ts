export interface CreateSessionInterface {
  id?: string;

  userId: string;
  refreshToken: string;

  userAgent?: string;
  ipAddress?: string;
  location?: string;
  isActive?: boolean;
  expiresAt: Date;
}

export interface UpdateSessionInterface {
  id: string;
  userId: string;

  refreshToken?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  isActive?: boolean;
  expiresAt: Date;
}

export interface GetAllSessions {
  userId: string;
}

export interface GetSession {
  id: string;
  userId: string;
}

export interface IGetSessionByParams {
  ip?: string;
  userId: string;
  userAgent?: string;
}
