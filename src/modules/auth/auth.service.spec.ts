jest.mock("../../config", () => ({
  envs: {
    JWT_REFRESH_SECRET: "mocked-refresh-secret",
    JWT_ACCESS_SECRET: "mocked-access-secret",
    REFRESH_GRACE_PERIOD_MS: 2000,
  },
}));

import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
import { TokensService } from "../tokens/tokens.service";
import { EmailsService } from "../emails/emails.service";
import { mockPrisma, makeUser, makeSession } from "../../common/testing";
import { SessionTokenService } from "./session-token.service";
import { TwoFactorService } from "./two-factor.service";
import type { Response } from "express";
import { PasswordRecoveryService } from "./password-recovery.service";

describe("AuthService", () => {
  let service: AuthService;

  const mockSessionService = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockTokensService = {
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockEmailsService = { sendEmail: jest.fn() };
  const mockUserService = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateTwoFactor: jest.fn(),
    update: jest.fn(),
  };
  const mockHashService = { hash: jest.fn(), verify: jest.fn() };
  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
  };
  const mockSessionTokenService = {
    createSessionWithTokens: jest.fn(),
    generateTokens: jest.fn(),
    setTokenCookies: jest.fn(),
    clearTokenCookies: jest.fn(),
  };
  const mockTwoFactorService = {
    generateTwoFactor: jest.fn(),
    enableTwoFactor: jest.fn(),
    disableTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
    regenerateBackupCodes: jest.fn(),
  };
  const mockPasswordRecoveryService = {
    forgotPassword: jest.fn(),
    verifyOtp: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUserService },
        { provide: HashService, useValue: mockHashService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: EmailsService, useValue: mockEmailsService },
        { provide: SessionTokenService, useValue: mockSessionTokenService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
        {
          provide: PasswordRecoveryService,
          useValue: mockPasswordRecoveryService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.resetAllMocks();
    mockJwtService.signAsync.mockResolvedValue("mocked-refresh-token");
    mockSessionService.findOne.mockResolvedValue(undefined);
    mockSessionService.delete.mockResolvedValue(undefined);
  });

  describe("login with trusted device", () => {
    it("should skip 2FA when trusted_device cookie is valid", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, password: "hashed" }),
      );
      mockHashService.verify.mockResolvedValue(true);
      mockJwtService.verify.mockReturnValue({ sub: "user-1" } as any);
      mockSessionTokenService.createSessionWithTokens.mockResolvedValue({
        id: "session-1",
      });

      const req = {
        cookies: { trusted_device: "valid-token" },
      } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      const result = await service.login(
        { email: "test@example.com", password: "pass" },
        res,
        req,
      );

      expect((result as { user: { email: string } }).user.email).toBe(
        "test@example.com",
      );
    });

    it("should require 2FA when trusted_device cookie is missing", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, password: "hashed" }),
      );
      mockHashService.verify.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("pending-token");

      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      const result = await service.login(
        { email: "test@example.com", password: "pass" },
        res,
        req,
      );

      expect((result as { requiresTwoFactor: boolean }).requiresTwoFactor).toBe(
        true,
      );
    });

    it("should reject invalid password", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ password: "hashed" }),
      );
      mockHashService.verify.mockResolvedValue(false);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      await expect(
        service.login(
          { email: "test@example.com", password: "wrong" } as any,
          res,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("register", () => {
    it("should create user and session", async () => {
      mockUserService.create.mockResolvedValue(
        makeUser({ id: "user-1", email: "test@test.com" }),
      );
      mockSessionTokenService.createSessionWithTokens.mockResolvedValue({
        id: "session-1",
      });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
      const result = await service.register(
        {
          email: "test@test.com",
          password: "Password123!",
          name: "Test",
        },
        res,
      );

      expect((result as { user: { email: string } }).user.email).toBe(
        "test@test.com",
      );
      expect(
        mockSessionTokenService.createSessionWithTokens,
      ).toHaveBeenCalled();
    });
  });

  describe("appleLogin", () => {
    it("should create user and session for first-time Apple login", async () => {
      mockUserService.findOne.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(
        makeUser({ id: "apple-user-1", email: "apple@test.com", name: "John", lastName: "Doe" }),
      );
      mockSessionTokenService.createSessionWithTokens.mockResolvedValue({
        id: "session-1",
      });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
      const result = await service.appleLogin(
        { appleId: "apple-sub", email: "apple@test.com", name: "John", lastName: "Doe" },
        res,
      );

      expect(result.user.email).toBe("apple@test.com");
      expect(result.user.name).toBe("John");
      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "apple@test.com",
          authProvider: "APPLE",
          emailConfirm: true,
        }),
      );
      expect(mockSessionTokenService.createSessionWithTokens).toHaveBeenCalledWith(
        "apple-user-1",
        res,
        undefined,
        undefined,
      );
    });

    it("should login existing user without creating a new one", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ id: "existing-apple-user", email: "apple@test.com", name: "John" }),
      );
      mockSessionTokenService.createSessionWithTokens.mockResolvedValue({
        id: "session-1",
      });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
      const result = await service.appleLogin(
        { appleId: "apple-sub", email: "apple@test.com" },
        res,
      );

      expect(result.user.email).toBe("apple@test.com");
      expect(result.user.id).toBe("existing-apple-user");
      expect(mockUserService.create).not.toHaveBeenCalled();
      expect(mockSessionTokenService.createSessionWithTokens).toHaveBeenCalledWith(
        "existing-apple-user",
        res,
        undefined,
        undefined,
      );
    });

    it("should throw BadRequestException on failure", async () => {
      mockUserService.findOne.mockRejectedValue(new Error("Critical DB Connection failure"));

      await expect(
        service.appleLogin({ appleId: "apple-sub", email: "apple@test.com" }, {} as Response),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("refresh", () => {
    it("should issue new tokens when version matches", async () => {
      const session = makeSession({
        id: "session-1",
        userId: "user-1",
        refreshTokenVersion: 0,
      });
      mockSessionService.findOne.mockResolvedValue(session);
      mockHashService.verify.mockResolvedValue(true);
      mockSessionTokenService.generateTokens.mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });
      mockHashService.hash.mockResolvedValue("new-hashed-refresh");
      mockSessionService.update.mockResolvedValue({ ...session, refreshTokenVersion: 1 });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      const result = await service.refresh(
        "user-1",
        "session-1",
        0,
        "valid-refresh-token",
        res,
      );

      expect(result.message).toBe("Tokens refreshed");
      expect(mockSessionTokenService.generateTokens).toHaveBeenCalledWith(
        "user-1",
        "session-1",
        1,
      );
      expect(mockSessionService.update).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenVersion: 1 }),
      );
      expect(mockSessionTokenService.setTokenCookies).toHaveBeenCalled();
      expect(mockSessionService.delete).not.toHaveBeenCalled();
    });

    it("should delete session when hash is invalid", async () => {
      const session = makeSession({
        id: "session-1",
        userId: "user-1",
        refreshTokenVersion: 0,
      });
      mockSessionService.findOne.mockResolvedValue(session);
      mockHashService.verify.mockResolvedValue(false);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      await expect(
        service.refresh("user-1", "session-1", 0, "stolen-token", res),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockSessionService.delete).toHaveBeenCalledWith({
        id: "session-1",
        userId: "user-1",
      });
      expect(mockSessionTokenService.clearTokenCookies).toHaveBeenCalledWith(res);
    });

    it("should NOT delete session when version mismatch is within grace period", async () => {
      const session = makeSession({
        id: "session-1",
        userId: "user-1",
        refreshTokenVersion: 1,
        lastUsedAt: new Date(),
      });
      mockSessionService.findOne.mockResolvedValue(session);
      mockHashService.verify.mockResolvedValue(true);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      await expect(
        service.refresh("user-1", "session-1", 0, "concurrent-token", res),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockSessionService.delete).not.toHaveBeenCalled();
      expect(mockSessionTokenService.clearTokenCookies).not.toHaveBeenCalled();
    });

    it("should delete session when version mismatch is outside grace period", async () => {
      const session = makeSession({
        id: "session-1",
        userId: "user-1",
        refreshTokenVersion: 1,
        lastUsedAt: new Date(Date.now() - 5000),
      });
      mockSessionService.findOne.mockResolvedValue(session);
      mockHashService.verify.mockResolvedValue(true);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;

      await expect(
        service.refresh("user-1", "session-1", 0, "attacker-token", res),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockSessionService.delete).toHaveBeenCalledWith({
        id: "session-1",
        userId: "user-1",
      });
      expect(mockSessionTokenService.clearTokenCookies).toHaveBeenCalledWith(res);
    });
  });

  describe("logout", () => {
    it("should delete session and clear cookies", async () => {
      mockSessionService.delete.mockResolvedValue({ id: "session-1" });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
      const result = await service.logout("user-1", "session-1", res);

      expect(result.message).toBe("Logged out successfully");
      expect(mockSessionTokenService.clearTokenCookies).toHaveBeenCalledWith(
        res,
      );
    });
  });
});
