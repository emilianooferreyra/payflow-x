import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { mockPrisma, makeUser, makeSession } from "../src/common/testing";
import { GlobalExceptionFilter } from "../src/common/filters/http-exception.filter";
import { envs } from "../src/config";
import * as otplib from "otplib";
import QRCode from "qrcode";

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
  let jwtService: JwtService;
  let accessToken: string;
  let twoFactorPendingToken: string;

  const activeSession = makeSession({
    id: "session-1",
    userId: "user-1",
    isActive: true,
  });

  const twoFactorUser = makeUser({
    id: "user-1",
    twoFactorSecret: "mocked-secret",
  });

  const twoFactorEnabledUser = makeUser({
    id: "user-1",
    twoFactorEnabled: true,
    twoFactorSecret: "mocked-secret",
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use(helmet());
    app.use(cookieParser());

    app.setGlobalPrefix("api");
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });

    app.enableCors({ origin: "*", credentials: true });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    jwtService = moduleFixture.get(JwtService);
    accessToken = jwtService.sign({ sub: "user-1", sessionId: "session-1" });
    twoFactorPendingToken = jwtService.sign(
      { sub: "user-1", type: "2fa_pending" },
      { expiresIn: "5m" },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockOtpVerify.mockReturnValue({ valid: true });
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );

    const otplibMock = jest.requireMock("otplib") as any;
    otplibMock.generateSecret.mockReturnValue("mocked-secret");
    otplibMock.generateURI.mockReturnValue("mocked-uri");
    otplibMock.verify.mockImplementation((..._args: any[]) => mockOtpVerify());

    const qrcodeMock = jest.requireMock("qrcode") as any;
    qrcodeMock.toDataURL.mockReturnValue("mocked-qr");
  });

  const authCookie = () => `access_token=${accessToken}`;

  function mockAuth() {
    mockPrisma.session.findUnique.mockResolvedValue(activeSession);
  }

  describe("POST /auth/2fa/generate", () => {
    it("should generate 2FA secret and QR code", async () => {
      mockAuth();
      mockPrisma.user.findFirst.mockResolvedValue(twoFactorUser);
      mockPrisma.user.update.mockResolvedValue(twoFactorUser);

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
      mockAuth();
      mockPrisma.user.findFirst.mockResolvedValue(twoFactorUser);
      mockPrisma.user.update.mockResolvedValue(twoFactorUser);
      mockPrisma.userBackupCode.createMany.mockResolvedValue({ count: 10 });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/enable`)
        .set("Cookie", authCookie())
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.message).toBe("Two-factor authentication enabled");
      expect(res.body.backupCodes).toHaveLength(10);
    });

    it("should return 400 without code", async () => {
      mockAuth();

      await request(app.getHttpServer())
        .post(`${BASE}/2fa/enable`)
        .set("Cookie", authCookie())
        .send({})
        .expect(400);
    });
  });

  describe("POST /auth/2fa/verify", () => {
    it("should verify 2FA and set auth cookies", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(twoFactorEnabledUser);
      mockPrisma.session.create.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
        refreshToken: "pending",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.session.findUnique.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.session.update.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
        refreshToken: "hashed-rt",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/verify`)
        .set("Cookie", `two_factor_pending=${twoFactorPendingToken}`)
        .send({ code: "123456" })
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"]
        : [res.headers["set-cookie"]];
      expect(cookies.some((c: string) => c.startsWith("access_token="))).toBe(
        true,
      );
      expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(
        true,
      );
    });

    it("should return 401 without two_factor_pending cookie", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/2fa/verify`)
        .send({ code: "123456" })
        .expect(401);
    });
  });

  describe("POST /auth/2fa/disable", () => {
    it("should disable 2FA", async () => {
      mockAuth();
      mockPrisma.user.findFirst.mockResolvedValue(twoFactorEnabledUser);
      mockPrisma.user.update.mockResolvedValue(twoFactorEnabledUser);
      mockPrisma.userBackupCode.deleteMany.mockResolvedValue({ count: 10 });

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
      mockAuth();
      mockPrisma.userBackupCode.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.userBackupCode.createMany.mockResolvedValue({ count: 10 });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/2fa/codes/regenerate`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.backupCodes).toHaveLength(10);
    });
  });
});
