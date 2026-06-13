import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TwoFactorService } from "./two-factor.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionTokenService } from "./session-token.service";
import { mockPrisma, makeUser } from "../../common/testing";

let mockOtpVerify = jest.fn(() => ({ valid: true }));

jest.mock("otplib", () => ({
  generateSecret: jest.fn(() => "mocked-secret"),
  generateURI: jest.fn(() => "mocked-uri"),
  verify: jest.fn((..._args: any[]) => mockOtpVerify()),
}));

jest.mock("qrcode", () => ({ toDataURL: jest.fn(() => "mocked-qr") }));

describe("TwoFactorService", () => {
  let service: TwoFactorService;

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

  beforeAll(() => {
    mockOtpVerify.mockReturnValue({ valid: true });
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUserService },
        { provide: HashService, useValue: mockHashService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: SessionTokenService, useValue: mockSessionTokenService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    jest.resetAllMocks();
    mockOtpVerify.mockReturnValue({ valid: true });

    const otplibMock = jest.requireMock("otplib") as any;
    otplibMock.generateSecret.mockReturnValue("mocked-secret");
    otplibMock.generateURI.mockReturnValue("mocked-uri");
    otplibMock.verify.mockImplementation((..._args: any[]) => mockOtpVerify());

    const qrcodeMock = jest.requireMock("qrcode") as any;
    qrcodeMock.toDataURL.mockReturnValue("mocked-qr");
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
      mockSessionTokenService.createSessionWithTokens.mockResolvedValue({
        id: "session-1",
      });

      const res = { cookie: jest.fn(), clearCookie: jest.fn() };
      const result = await service.verifyTwoFactor(
        "user-1",
        "ABCD1234",
        res,
      );

      expect(
        (result as { user: { email: string } }).user.email,
      ).toBe("test@example.com");
      expect(mockPrisma.userBackupCode.update).toHaveBeenCalledWith({
        where: { id: "bc-1" },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("should reject invalid backup code", async () => {
      mockUserService.findOne.mockResolvedValue(
        makeUser({ twoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockHashService.verify.mockRejectedValue(
        new Error("should not be called"),
      );
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

  describe("generateTwoFactor", () => {
    it("should generate secret and QR code", async () => {
      mockUserService.findOne.mockResolvedValue(makeUser({ id: "user-1" }));

      const result = await service.generateTwoFactor("user-1");

      expect(result.qrCode).toBe("mocked-qr");
      expect(result.manualEntryKey).toBe("mocked-secret");
      expect(mockUserService.updateTwoFactor).toHaveBeenCalledWith("user-1", {
        twoFactorSecret: "mocked-secret",
      });
    });
  });
});
