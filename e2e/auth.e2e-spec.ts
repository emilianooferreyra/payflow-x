import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { HashService } from "../src/modules/hash/hash.service";
import { setupE2eApp } from "./setup-app";
import { cleanDatabase } from "./db-cleanup";

const BASE = "/api/v1/auth";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let hashService: HashService;

  beforeAll(async () => {
    const { app: a, moduleFixture } = await setupE2eApp();
    app = a;
    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);
    hashService = moduleFixture.get(HashService);
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  describe("POST /auth/register", () => {
    it("should register a new user and set auth cookies", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({ email: "test@test.com", password: "Password123!", name: "Test" })
        .expect(201);

      expect(res.headers["set-cookie"]).toBeDefined();
      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"]
        : [res.headers["set-cookie"]];
      expect(cookies.some((c: string) => c.startsWith("access_token="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
    });

    it("should reject duplicate email", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({ email: "dup@test.com", password: "Password123!", name: "Test" })
        .expect(201);

      await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({ email: "dup@test.com", password: "Password123!", name: "Test" })
        .expect(400);
    });

    it("should return 400 for invalid email", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({ email: "not-an-email", password: "Password123!", name: "Test" })
        .expect(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      const passwordHash = await hashService.hash("Password123!");
      await prisma.user.create({
        data: {
          id: "login-user-id",
          email: "login@test.com",
          password: passwordHash,
          name: "Login User",
          status: "ACTIVE",
          authProvider: "LOCAL",
          country: "AR",
          language: "es-ES",
        },
      });
    });

    it("should login and set auth cookies", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: "login@test.com", password: "Password123!" })
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should return 401 for wrong password", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: "login@test.com", password: "WrongPassword1!" })
        .expect(401);
    });

    it("should return 401 for non-existent user", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: "nonexistent@test.com", password: "Password123!" })
        .expect(404);
    });
  });

  describe("POST /auth/refresh", () => {
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashService.hash("Password123!");
      await prisma.user.create({
        data: {
          id: "refresh-user-id",
          email: "refresh@test.com",
          password: passwordHash,
          name: "Refresh User",
          status: "ACTIVE",
          authProvider: "LOCAL",
        },
      });

      refreshToken = await jwtService.signAsync(
        { sub: "refresh-user-id", sessionId: "refresh-session-id" },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: "7d" },
      );
      const refreshTokenHash = await hashService.hash(refreshToken);

      await prisma.session.create({
        data: {
          id: "refresh-session-id",
          userId: "refresh-user-id",
          refreshToken: refreshTokenHash,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it("should refresh tokens with valid refresh_token cookie", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .set("Cookie", [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should return 401 without refresh token", async () => {
      await request(app.getHttpServer()).post(`${BASE}/refresh`).expect(401);
    });
  });

  describe("POST /auth/logout", () => {
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashService.hash("Password123!");
      await prisma.user.create({
        data: {
          id: "logout-user-id",
          email: "logout@test.com",
          password: passwordHash,
          name: "Logout User",
          status: "ACTIVE",
          authProvider: "LOCAL",
        },
      });

      refreshToken = await jwtService.signAsync(
        { sub: "logout-user-id", sessionId: "logout-session-id" },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: "7d" },
      );
      const refreshTokenHash = await hashService.hash(refreshToken);

      await prisma.session.create({
        data: {
          id: "logout-session-id",
          userId: "logout-user-id",
          refreshToken: refreshTokenHash,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it("should logout and clear auth cookies", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/logout`)
        .set("Cookie", [`refresh_token=${refreshToken}`])
        .expect(200);

      const cookies = Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"]
        : [res.headers["set-cookie"]];
      expect(cookies.some((c: string) => c.includes("access_token=;"))).toBe(true);
    });
  });
});
