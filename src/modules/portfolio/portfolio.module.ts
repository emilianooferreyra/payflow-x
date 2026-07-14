import { Module } from "@nestjs/common";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioService } from "./portfolio.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PricesModule } from "../prices/prices.module";

@Module({
  imports: [PrismaModule, PricesModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
