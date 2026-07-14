import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MARKET_META } from "./constants/market.constants";

@Injectable()
export class BrokersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.broker.findMany({
      where: { isActive: true },
      orderBy: { feeBuyPct: "asc" },
    });
  }

  async getTariff() {
    const brokers = await this.findActive();
    return { meta: MARKET_META, brokers };
  }
}
