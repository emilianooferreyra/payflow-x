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

let mockOtpVerify = jest.fn(() => ({ valid: true }));

jest.mock("otplib", () => ({
  generateSecret: jest.fn(() => "mocked-secret"),
  generateURI: jest.fn(() => "mocked-uri"),
  verify: (..._args: any[]) => mockOtpVerify(),
}));

jest.mock("qrcode", () => ({ toDataURL: jest.fn(() => "mocked-qr") }));

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

  beforeAll(() => {
    mockOtpVerify.mockReturnValue({ valid: true });
  });

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.resetAllMocks();
    mockOtpVerify.mockReturnValue({ valid: true });
    mockJwtService.signAsync.mockResolvedValue("mocked-refresh-token");
  });

  describe("enableTwoFactor", () => {
    it("should generate 10 backup codes on enable", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorSecret: "secret" }),
      );
      mockHashService.hash.mockResolvedValue("hashed");
      mockPrisma.userBackupCode.createMany.mockResolvedValue({ count: 10 });

      const result = await service.enableTwoFactor("user-1", "123456");

      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrisma.userBackupCode.createMany).toHaveBeenCalled();
    });
  });

  describe("verifyTwoFactor with backup codes", () => {
    it("should verify backup code and mark as used", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockHashService.verify.mockResolvedValue(true);
      mockPrisma.userBackupCode.findMany.mockResolvedValue([
        { id: "bc-1", code: "hashed", usedAt: null },
      ]);
      mockSessionService.create.mockResolvedValue({ id: "session-1" });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      const result = await service.verifyTwoFactor(
        "user-1",
        "ABCD1234",
        res,
      );

      expect((result as { user: { email: string } }).user.email).toBe("test@example.com");
      expect(mockPrisma.userBackupCode.update).toHaveBeenCalledWith({
        where: { id: "bc-1" },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("should reject invalid backup code", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockHashService.verify.mockRejectedValue(new Error("should not be called"));
      mockPrisma.userBackupCode.findMany.mockResolvedValue([]);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      await expect(
        service.verifyTwoFactor("user-1", "ABCD1234", res),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("rate limiting", () => {
    it("should block after 5 failed attempts", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockOtpVerify.mockReturnValue({ valid: false });
      mockPrisma.userBackupCode.findMany.mockResolvedValue([]);

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      for (let i = 0; i < 5; i++) {
        await expect(
          service.verifyTwoFactor("user-1", "000000", res),
        ).rejects.toThrow(UnauthorizedException);
      }

      await expect(
        service.verifyTwoFactor("user-1", "000000", res),
      ).rejects.toThrow("Too many 2FA attempts");
    });
  });

  describe("regenerateBackupCodes", () => {
    it("should replace all backup codes", async () => {
      mockPrisma.userBackupCode.deleteMany.mockResolvedValue({ count: 10 });
      mockHashService.hash.mockResolvedValue("hashed");
      mockPrisma.userBackupCode.createMany.mockResolvedValue({ count: 10 });

      const result = await service.regenerateBackupCodes("user-1");

      expect(result.backupCodes).toHaveLength(10);
      expect(mockPrisma.userBackupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("disableTwoFactor", () => {
    it("should delete backup codes when disabling 2FA", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockPrisma.userBackupCode.deleteMany.mockResolvedValue({ count: 10 });

      await service.disableTwoFactor("user-1", "123456");

      expect(mockPrisma.userBackupCode.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("login with trusted device", () => {
    it("should skip 2FA when trusted_device cookie is valid", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, password: "hashed" }),
      );
      mockHashService.verify.mockResolvedValue(true);
      mockJwtService.verify.mockReturnValue({ sub: "user-1" } as any);
      mockSessionService.create.mockResolvedValue({ id: "session-1" });

      const req = {
        cookies: { trusted_device: "valid-token" },
      } as any;
      const res = { cookie: jest.fn(), clearCookie: jest.fn() };

      const result = await service.login(
        { email: "test@example.com", password: "pass" } as any,
        res,
        req,
      );

      expect((result as { user: { email: string } }).user.email).toBe("test@example.com");
    });
  });
});
