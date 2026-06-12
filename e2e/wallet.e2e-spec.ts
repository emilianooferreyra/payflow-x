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
import { mockPrisma, makeWallet, makeSession } from "../src/common/testing";
import { GlobalExceptionFilter } from "../src/common/filters/http-exception.filter";

const BASE = "/api/v1/wallet";

describe("Wallet (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

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

  const authCookie = () => `access_token=${accessToken}`;
  const activeSession = makeSession({
    id: "session-1",
    userId: "user-1",
    isActive: true,
  });
  const approvedKyc = { status: "APPROVED" };

  function mockAuth() {
    mockPrisma.session.findUnique.mockResolvedValue(activeSession);
  }

  function mockWebhookEmpty() {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);
  }

  describe("GET /wallet", () => {
    it("should return wallets for authenticated user", async () => {
      mockAuth();
      mockPrisma.wallet.findMany.mockResolvedValue([
        makeWallet({ userId: "user-1", currency: "ARS", balance: 5000 }),
        makeWallet({ userId: "user-1", currency: "USD", balance: 100 }),
      ]);

      const res = await request(app.getHttpServer())
        .get(BASE)
        .set("Cookie", authCookie())
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it("should return 401 without auth cookie", async () => {
      await request(app.getHttpServer()).get(BASE).expect(401);
    });
  });

  describe("POST /wallet/deposit", () => {
    it("should deposit and create transaction", async () => {
      mockAuth();
      mockWebhookEmpty();
      const wallet = makeWallet({ userId: "user-1", balance: 1000 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: 500,
        currency: "ARS",
        status: "COMPLETED",
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/deposit`)
        .set("Cookie", authCookie())
        .send({ amount: 500, currency: "ARS" })
        .expect(201);

      expect(res.body.type).toBe("DEPOSIT");
    });

    it("should create wallet on first deposit", async () => {
      mockAuth();
      mockWebhookEmpty();
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.create.mockResolvedValue(
        makeWallet({ userId: "user-1", balance: 500 }),
      );
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        type: "DEPOSIT",
        amount: 500,
        currency: "ARS",
        status: "COMPLETED",
      });

      const res = await request(app.getHttpServer())
        .post(`${BASE}/deposit`)
        .set("Cookie", authCookie())
        .send({ amount: 500, currency: "ARS" })
        .expect(201);

      expect(res.body.type).toBe("DEPOSIT");
    });

    it("should return 400 for invalid amount", async () => {
      mockAuth();
      mockWebhookEmpty();

      await request(app.getHttpServer())
        .post(`${BASE}/deposit`)
        .set("Cookie", authCookie())
        .send({ amount: -100, currency: "ARS" })
        .expect(400);
    });
  });

  describe("POST /wallet/withdraw", () => {
    it("should withdraw and create transaction", async () => {
      mockAuth();
      mockWebhookEmpty();
      mockPrisma.kycVerification.findUnique.mockResolvedValue(approvedKyc);
      const wallet = makeWallet({ userId: "user-1", balance: 1000 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-2",
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amount: 500,
        currency: "ARS",
        status: "COMPLETED",
      });

      await request(app.getHttpServer())
        .post(`${BASE}/withdraw`)
        .set("Cookie", authCookie())
        .send({ amount: 500, currency: "ARS" })
        .expect(201);
    });

    it("should return 422 on insufficient balance", async () => {
      mockAuth();
      mockPrisma.kycVerification.findUnique.mockResolvedValue(approvedKyc);
      mockPrisma.wallet.findUnique.mockResolvedValue(
        makeWallet({ userId: "user-1", balance: 100 }),
      );

      await request(app.getHttpServer())
        .post(`${BASE}/withdraw`)
        .set("Cookie", authCookie())
        .send({ amount: 9999, currency: "ARS" })
        .expect(422);
    });
  });
});
