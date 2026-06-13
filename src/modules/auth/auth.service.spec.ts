import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
import { TokensService } from "../tokens/tokens.service";
import { EmailsService } from "../emails/emails.service";
import { mockPrisma, makeUser } from "../../common/testing";
import { SessionTokenService } from "./session-token.service";
import { TwoFactorService } from "./two-factor.service";
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
        { provide: PasswordRecoveryService, useValue: mockPasswordRecoveryService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.resetAllMocks();
    mockJwtService.signAsync.mockResolvedValue("mocked-refresh-token");
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
      const res = { cookie: jest.fn(), clearCookie: jest.fn() };

      const result = await service.login(
        { email: "test@example.com", password: "pass" } as any,
        res,
        req,
      );

      expect(
        (result as { user: { email: string } }).user.email,
      ).toBe("test@example.com");
    });

    it("should require 2FA when trusted_device cookie is missing", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, password: "hashed" }),
      );
      mockHashService.verify.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("pending-token");

      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() };

      const result = await service.login(
        { email: "test@example.com", password: "pass" } as any,
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

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };

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

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      const result = await service.register(
        {
          email: "test@test.com",
          password: "Password123!",
          name: "Test",
        } as any,
        res,
      );

      expect((result as { user: { email: string } }).user.email).toBe(
        "test@test.com",
      );
      expect(mockSessionTokenService.createSessionWithTokens).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should delete session and clear cookies", async () => {
      mockSessionService.delete.mockResolvedValue({ id: "session-1" });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      const result = await service.logout("user-1", "session-1", res);

      expect(result.message).toBe("Logged out successfully");
      expect(mockSessionTokenService.clearTokenCookies).toHaveBeenCalledWith(
        res,
      );
    });
  });
});
