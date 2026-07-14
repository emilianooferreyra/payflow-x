import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PricesService } from "../prices/prices.service";
import { assertFound } from "../../common/utils/assert-found";
import { CreatePortfolioDto } from "./dto/create-portfolio.dto";
import { UpdatePortfolioDto } from "./dto/update-portfolio.dto";
import { AddAssetDto } from "./dto/add-asset.dto";
import { PortfolioQueryDto } from "./dto/portfolio-query.dto";

const round2 = (value: number) => parseFloat(value.toFixed(2));

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricesService: PricesService,
  ) {}

  async create(userId: string, dto: CreatePortfolioDto) {
    return this.prisma.portfolio.create({ data: { userId, ...dto } });
  }

  async findAll(userId: string, query: PortfolioQueryDto) {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.portfolio.findMany({
      where: { userId },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async findOne(userId: string, id: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id },
      include: { assets: true },
    });
    assertFound(portfolio, "Portfolio");
    if (portfolio.userId !== userId) {
      throw new ForbiddenException("You do not own this portfolio.");
    }
    return portfolio;
  }

  async update(userId: string, id: string, dto: UpdatePortfolioDto) {
    await this.findOne(userId, id);
    return this.prisma.portfolio.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.portfolio.delete({ where: { id } });
  }

  async addAsset(userId: string, portfolioId: string, dto: AddAssetDto) {
    await this.findOne(userId, portfolioId);
    return this.prisma.portfolioAsset.create({
      data: { portfolioId, ...dto },
    });
  }

  async removeAsset(userId: string, portfolioId: string, assetId: string) {
    await this.findOne(userId, portfolioId);
    const asset = await this.prisma.portfolioAsset.findFirst({
      where: { id: assetId, portfolioId },
    });
    assertFound(asset, "Asset");
    await this.prisma.portfolioAsset.delete({ where: { id: assetId } });
  }

  async getValuation(userId: string, id: string) {
    const portfolio = await this.findOne(userId, id);
    const prices = await this.pricesService.getPrices(
      portfolio.assets.map((asset) => asset.symbol),
    );

    let totalValueUSD = 0;
    const assets = portfolio.assets.map((asset, index) => {
      const currentPrice = prices[index]?.price ?? null;
      const quantity = Number(asset.quantity);
      const avgBuyPrice = Number(asset.avgBuyPrice);

      if (currentPrice == null) {
        return {
          symbol: asset.symbol,
          quantity,
          currentPrice: null,
          valueUSD: null,
          pnl: null,
          pnlPercent: null,
        };
      }

      const valueUSD = round2(currentPrice * quantity);
      totalValueUSD += valueUSD;

      return {
        symbol: asset.symbol,
        quantity,
        currentPrice,
        valueUSD,
        pnl: round2((currentPrice - avgBuyPrice) * quantity),
        pnlPercent:
          avgBuyPrice > 0
            ? round2(((currentPrice - avgBuyPrice) / avgBuyPrice) * 100)
            : null,
      };
    });

    return {
      portfolioId: portfolio.id,
      totalValueUSD: round2(totalValueUSD),
      assets,
    };
  }
}
