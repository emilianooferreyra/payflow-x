import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { setupE2eApp } from "./setup-app";
import { cleanDatabase } from "./db-cleanup";

const BASE = "/api/v1/users";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;

  beforeAll(async () => {
    const { app: a, moduleFixture } = await setupE2eApp();
    app = a;
    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: "users-test-user-id",
        email: "users@test.com",
        password: "hashed",
        name: "Users Test",
        status: "ACTIVE",
        authProvider: "LOCAL",
      },
    });

    await prisma.session.create({
      data: {
        id: "users-test-session-id",
        userId: "users-test-user-id",
        refreshToken: "hashed-refresh-token",
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    accessToken = jwtService.sign({
      sub: "users-test-user-id",
      sessionId: "users-test-session-id",
    });
  });

  const authCookie = () => `access_token=${accessToken}`;

  describe("GET /users/me", () => {
    beforeEach(async () => {
      await prisma.kycVerification.create({
        data: {
          userId: "users-test-user-id",
          status: "APPROVED",
        },
      });
    });

    it("should return profile for authenticated user", async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/me`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.id).toBe("users-test-user-id");
      expect(res.body.email).toBe("users@test.com");
      expect(res.body.name).toBe("Users Test");
      expect(res.body.kyc).toBeDefined();
      expect(res.body.kyc.status).toBe("APPROVED");
    });

    it("should return 401 without auth cookie", async () => {
      await request(app.getHttpServer()).get(`${BASE}/me`).expect(401);
    });

    it("should include kyc when it exists", async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/me`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.kyc).toBeDefined();
      expect(res.body.kyc.status).toBe("APPROVED");
      expect(res.body.kyc.documentType).toBeDefined();
    });

    it("should return profile without kyc when kyc doesn't exist", async () => {
      await prisma.kycVerification.deleteMany({
        where: { userId: "users-test-user-id" },
      });

      const res = await request(app.getHttpServer())
        .get(`${BASE}/me`)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body.kyc).toBeNull();
    });
  });

  describe("PATCH /users/me", () => {
    it("should update user name", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/me`)
        .set("Cookie", authCookie())
        .send({ name: "Updated Name" })
        .expect(200);

      expect(res.body.name).toBe("Updated Name");
    });

    it("should return 400 for invalid email", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/me`)
        .set("Cookie", authCookie())
        .send({ email: "invalid" })
        .expect(400);
    });

    it("should return 401 without auth cookie", async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/me`)
        .send({ name: "New Name" })
        .expect(401);
    });
  });
});
