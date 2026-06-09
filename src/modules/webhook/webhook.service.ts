import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

interface WebhookEvent {
  type: "deposit.confirmed" | "withdraw.completed";
  data: Record<string, unknown>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly MAX_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(event: WebhookEvent) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { active: true },
    });

    if (endpoints.length === 0) return;

    const payload = JSON.stringify({
      event: event.type,
      data: event.data,
      timestamp: new Date().toISOString(),
    });

    for (const endpoint of endpoints) {
      await this.deliver(endpoint.id, endpoint.url, endpoint.secret, event.type, payload, 0);
    }
  }

  private async deliver(
    endpointId: string,
    url: string,
    secret: string,
    event: string,
    payload: string,
    attempt: number,
  ) {
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        endpointId,
        event,
        payload,
        status: "pending",
        attempts: attempt,
      },
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
        },
        body: payload,
      });

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? "delivered" : "failed",
          attempts: attempt + 1,
          responseStatus: response.status,
        },
      });

      if (!response.ok && attempt + 1 < this.MAX_ATTEMPTS) {
        this.scheduleRetry(endpointId, url, secret, event, payload, attempt + 1);
      }
    } catch (error) {
      this.logger.warn(`Webhook delivery failed: ${url} — ${error}`);

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          attempts: attempt + 1,
        },
      });

      if (attempt + 1 < this.MAX_ATTEMPTS) {
        this.scheduleRetry(endpointId, url, secret, event, payload, attempt + 1);
      }
    }
  }

  private scheduleRetry(
    endpointId: string,
    url: string,
    secret: string,
    event: string,
    payload: string,
    attempt: number,
  ) {
    const delays = [60_000, 300_000, 900_000];
    const delay = delays[attempt - 1] ?? 900_000;
    const nextRetryAt = new Date(Date.now() + delay);

    this.prisma.webhookDelivery
      .updateMany({
        where: {
          endpointId,
          event,
          payload,
          status: "failed",
        },
        data: { nextRetryAt },
      })
      .catch((err) => this.logger.error("Failed to schedule retry", err));

    setTimeout(() => {
      this.deliver(endpointId, url, secret, event, payload, attempt);
    }, delay);
  }
}
