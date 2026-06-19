import { Test, TestingModule } from "@nestjs/testing";
import { createHmac } from "node:crypto";
import { WebhookService } from "./webhook.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma } from "../../common/testing";

jest.useFakeTimers();

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("WebhookService", () => {
  let service: WebhookService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mockPrisma defaults
    mockPrisma.webhookEndpoint.findMany.mockReset();
    mockPrisma.webhookDelivery.create.mockReset();
    mockPrisma.webhookDelivery.update.mockReset();
    mockPrisma.webhookDelivery.updateMany.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  const event: Parameters<typeof service.dispatch>[0] = {
    type: "deposit.confirmed",
    data: {
      walletId: "w-1",
      userId: "u-1",
      amount: "500",
      currency: "USD",
      transactionId: "tx-1",
    },
  };

  const payload = JSON.stringify({
    event: "deposit.confirmed",
    data: {
      walletId: "w-1",
      userId: "u-1",
      amount: "500",
      currency: "USD",
      transactionId: "tx-1",
    },
    timestamp: expect.any(String),
  });

  // ---------------------------------------------------------------------------
  // 2.3 — dispatch with no endpoints
  // ---------------------------------------------------------------------------
  describe("dispatch", () => {
    it("should not make any HTTP calls when there are no active endpoints", async () => {
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await service.dispatch(event);

      expect(mockPrisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: { active: true },
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------------------
    // 2.2 — dispatch with active endpoints
    // ---------------------------------------------------------------------------
    it("should fetch endpoints, sign payload, post to each, and create delivery records", async () => {
      const endpoints = [
        {
          id: "ep-1",
          url: "https://example.com/webhook",
          secret: "secret-1",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ep-2",
          url: "https://other.com/hook",
          secret: "secret-2",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      mockPrisma.webhookDelivery.create
        .mockResolvedValueOnce({ id: "del-1" })
        .mockResolvedValueOnce({ id: "del-2" });
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await service.dispatch(event);

      expect(mockPrisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: { active: true },
      });
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Each delivery gets a delivery record created, then fetch called, then updated
      for (const ep of endpoints) {
        expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith({
          data: {
            endpointId: ep.id,
            event: "deposit.confirmed",
            payload: expect.any(String),
            status: "pending",
            attempts: 0,
          },
        });
        expect(mockFetch).toHaveBeenCalledWith(
          ep.url,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
            body: expect.any(String),
          }),
        );
      }
    });

    // ---------------------------------------------------------------------------
    // 2.4 — HMAC-SHA256 signature
    // ---------------------------------------------------------------------------
    it("should set X-Webhook-Signature header matching HMAC-SHA256 of payload", async () => {
      const endpoint = {
        id: "ep-1",
        url: "https://example.com/webhook",
        secret: "test-secret",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([endpoint]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "del-1" });
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await service.dispatch(event);

      const actualPayload = mockFetch.mock.calls[0][1].body;
      const expectedSig = createHmac("sha256", "test-secret")
        .update(actualPayload)
        .digest("hex");

      expect(mockFetch).toHaveBeenCalledWith(
        endpoint.url,
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Webhook-Signature": expectedSig,
          }),
        }),
      );
    });

    // ---------------------------------------------------------------------------
    // 2.5 — delivered on 2xx
    // ---------------------------------------------------------------------------
    it("should update delivery status to delivered on 2xx response", async () => {
      const endpoint = {
        id: "ep-1",
        url: "https://example.com/webhook",
        secret: "secret",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([endpoint]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "del-1" });
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await service.dispatch(event);

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: "del-1" },
        data: {
          status: "delivered",
          attempts: 1,
          responseStatus: 200,
        },
      });
    });

    // ---------------------------------------------------------------------------
    // 2.6 — pending retry on failure
    // ---------------------------------------------------------------------------
    it("should update delivery status to failed and schedule retry on error", async () => {
      jest.spyOn(global, "setTimeout");

      const endpoint = {
        id: "ep-1",
        url: "https://example.com/webhook",
        secret: "secret",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([endpoint]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "del-1" });
      mockFetch.mockRejectedValue(new Error("Network error"));
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.webhookDelivery.updateMany.mockResolvedValue({ count: 1 });

      await service.dispatch(event);

      // Failed delivery update
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: "del-1" },
        data: {
          status: "failed",
          attempts: 1,
        },
      });

      // Retry scheduled via updateMany (nextRetryAt)
      expect(mockPrisma.webhookDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          endpointId: "ep-1",
          event: "deposit.confirmed",
          payload: expect.any(String),
          status: "failed",
        },
        data: {
          nextRetryAt: expect.any(Date),
        },
      });

      // setTimeout scheduled
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
  });
});
