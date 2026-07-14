import { ApiCookieAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PricesService } from "./prices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Prices")
@ApiCookieAuth()
@Controller("prices")
@UseGuards(JwtAuthGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  @ApiQuery({ name: "symbols", example: "AAPL,BTC,ETH" })
  async getBatch(@Query("symbols") symbols?: string) {
    const parsed = (symbols ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      throw new BadRequestException("Query param 'symbols' is required.");
    }

    return this.pricesService.getPrices(parsed);
  }

  @Get(":symbol")
  async getOne(@Param("symbol") symbol: string) {
    const price = await this.pricesService.getPrice(symbol);
    if (!price) {
      throw new NotFoundException(`No price available for symbol ${symbol}`);
    }
    return price;
  }
}
