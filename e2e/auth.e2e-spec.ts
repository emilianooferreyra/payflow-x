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
import { mockPrisma } from "../src/common/testing";
import { GlobalExceptionFilter } from "../src/common/filters/http-exception.filter";
import { HashService } from "../src/modules/hash/hash.service";
import { envs } from "../src/config";

const BASE = "/api/v1/auth";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let hashService: HashService;
  let realPasswordHash: string;
  let realRefreshToken: string;
  let refreshTokenHash: string;

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
    hashService = moduleFixture.get(HashService);
    realPasswordHash = await hashService.hash("Password123!");
    realRefreshToken = await jwtService.signAsync(
      { sub: "user-1", sessionId: "session-1" },
      { secret: envs.JWT_REFRESH_SECRET, expiresIn: "7d" },
    );
    refreshTokenHash = await hashService.hash(realRefreshToken);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
  });

  function sessionMocks() {
    mockPrisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      refreshToken: "hashed-rt",
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    mockPrisma.session.update.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      refreshToken: "new-hashed-rt",
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  describe("POST /auth/register", () => {
    it("should register a new user and set auth cookies", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        name: "Test",
        password: "hashed",
        status: "DRAFT",
        authProvider: "LOCAL",
        country: "AR",
        language: "es-ES",
        emailConfirm: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.session.create.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        refreshToken: "hashed-rt",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      sessionMocks();

      const res = await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({
          email: "test@test.com",
          password: "Password123!",
          name: "Test",
        })
        .expect(201);

      expect(res.headers["set-cookie"]).toBeDefined();
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
  });

  describe("POST /auth/login", () => {
    it("should login and set auth cookies", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        password: realPasswordHash,
        name: "Test",
        status: "ACTIVE",
        authProvider: "LOCAL",
        country: "AR",
        language: "es-ES",
        emailConfirm: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.session.create.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        refreshToken: "hashed-rt",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      sessionMocks();

      const res = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: "test@test.com", password: "Password123!" })
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh tokens with valid refresh_token cookie", async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        refreshToken: refreshTokenHash,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        userAgent: null,
        ipAddress: null,
        location: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        name: "Test",
        status: "ACTIVE",
        authProvider: "LOCAL",
      });
      mockPrisma.session.create.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
        refreshToken: "new-hashed-rt",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.session.update.mockResolvedValue({
        id: "session-1",
        isActive: false,
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .set("Cookie", [`refresh_token=${realRefreshToken}`])
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout and clear auth cookies", async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        refreshToken: refreshTokenHash,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        userAgent: null,
        ipAddress: null,
        location: null,
      });
      mockPrisma.session.update.mockResolvedValue({
        id: "session-1",
        isActive: false,
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/logout`)
        .set("Cookie", [`refresh_token=${realRefreshToken}`])
        .expect(200);

      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"]
        : [res.headers["set-cookie"]];
      expect(cookies.some((c: string) => c.includes("access_token=;"))).toBe(
        true,
      );
    });
  });
});
