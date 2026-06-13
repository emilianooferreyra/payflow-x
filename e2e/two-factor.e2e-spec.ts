import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { setupE2eApp } from "./setup-app";
import { cleanDatabase } from "./db-cleanup";

const BASE = "/api/v1/auth";

let mockOtpVerify = jest.fn(() => ({ valid: true }));

jest.mock("otplib", () => ({
  generateSecret: jest.fn(() => "mocked-secret"),
  generateURI: jest.fn(() => "mocked-uri"),
  verify: jest.fn((..._args: any[]) => mockOtpVerify()),
}));

jest.mock("qrcode", () => ({ toDataURL: jest.fn(() => "mocked-qr") }));

describe("Two-Factor (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;
  let twoFactorPendingToken: string;

  beforeAll(async () => {
    const { app: a, moduleFixture } = await setupE2eApp();
    app = a;
    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    mockOtpVerify.mockReturnValue({ valid: true });

    const otplibMock = jest.requireMock("otplib") as any;
    otplibMock.generateSecret.mockReturnValue("mocked-secret");
    otplibMock.generateURI.mockReturnValue("mocked-uri");
    otplibMock.verify.mockImplementation((..._args: any[]) => mockOtpVerify());

    const qrcodeMock = jest.requireMock("qrcode") as any;
    qrcodeMock.toDataURL.mockReturnValue("mocked-qr");

    await prisma.user.create({
      data: {
        id: "2fa-user-id",
        email: "2fa@test.com",
        password: "hashed",
        name: "2FA User",
        status: "ACTIVE",
        authProvider: "LOCAL",
        twoFactorSecret: "mocked-secret",
      },
    });

    await prisma.session.create({
      data: {
        id: "2fa-session-id",
        userId: "2fa-user-id",
        refreshToken: "hashed-refresh-token",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    accessToken = jwtService.sign({
      sub: "2fa-user-id",
      sessionId: "2fa-session-id",
    });
    twoFactorPendingToken = jwtService.sign(
      { sub: "2fa-user-id", type: "2fa_pending" },
      { expiresIn: "5m" },
    );
  });

  const authCookie = () => `access_token=${accessToken}`;

  describe("POST /auth/2fa/generate", () => {
    it("should generate 2FA secret and QR code", async () => {
      await prisma.user.update({
        where: { id: "2fa-user-id" },
        data: { twoFactorEnabled: false },
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/generate`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.qrCode).toBe("mocked-qr");
      expect(res.body.manualEntryKey).toBe("mocked-secret");
    });

    it("should return 401 without auth cookie", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/2fa/generate`)
        .expect(401);
    });
  });

  describe("POST /auth/2fa/enable", () => {
    it("should enable 2FA and return backup codes", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/enable`)
        .set("Cookie", authCookie())
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.message).toBe("Two-factor authentication enabled");
      expect(res.body.backupCodes).toHaveLength(10);
    });

    it("should return 400 without code", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/2fa/enable`)
        .set("Cookie", authCookie())
        .send({})
        .expect(400);
    });
  });

  describe("POST /auth/2fa/verify", () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: "2fa-user-id" },
        data: { twoFactorEnabled: true },
      });
    });

    it("should verify 2FA and set auth cookies", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/verify`)
        .set("Cookie", `two_factor_pending=${twoFactorPendingToken}`)
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("2fa@test.com");
      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"]
        : [res.headers["set-cookie"]];
      expect(cookies.some((c: string) => c.startsWith("access_token="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
    });

    it("should return 401 without two_factor_pending cookie", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/2fa/verify`)
        .send({ code: "123456" })
        .expect(401);
    });

    it("should return 401 with invalid code", async () => {
      mockOtpVerify.mockReturnValue({ valid: false });

      await request(app.getHttpServer())
        .post(`${BASE}/2fa/verify`)
        .set("Cookie", `two_factor_pending=${twoFactorPendingToken}`)
        .send({ code: "000000" })
        .expect(401);
    });
  });

  describe("POST /auth/2fa/disable", () => {
    beforeEach(async () => {
      await prisma.user.update({
        where: { id: "2fa-user-id" },
        data: { twoFactorEnabled: true },
      });
    });

    it("should disable 2FA", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/disable`)
        .set("Cookie", authCookie())
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.message).toBe("Two-factor authentication disabled");
    });
  });

  describe("POST /auth/2fa/codes/regenerate", () => {
    it("should regenerate backup codes", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/codes/regenerate`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.backupCodes).toHaveLength(10);
    });
  });
});
