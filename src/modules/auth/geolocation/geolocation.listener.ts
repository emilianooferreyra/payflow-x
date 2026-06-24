import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { GeolocationService } from "./geolocation.service";

interface SessionCreatedEvent {
  sessionId: string;
  ip: string;
}

@Injectable()
export class GeolocationListener {
  private readonly logger = new Logger(GeolocationListener.name);

  constructor(
    private readonly geolocationService: GeolocationService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent("session.created")
  async handleSessionCreated(event: SessionCreatedEvent): Promise<void> {
    try {
      const location = await this.geolocationService.resolve(event.ip);

      if (!location) return;

      await this.prisma.session.update({
        where: { id: event.sessionId },
        data: { location },
      });

      this.logger.debug(
        `Location set for session ${event.sessionId}: ${location}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to resolve location for session ${event.sessionId}: ${(error as Error).message}`,
      );
    }
  }
}
