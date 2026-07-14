import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreatePortfolioDto } from "./dto/create-portfolio.dto";
import { UpdatePortfolioDto } from "./dto/update-portfolio.dto";
import { AddAssetDto } from "./dto/add-asset.dto";
import { PortfolioQueryDto } from "./dto/portfolio-query.dto";

@ApiTags("Portfolio")
@ApiCookieAuth()
@Controller("portfolio")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.create(user.userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user, @Query() query: PortfolioQueryDto) {
    return this.portfolioService.findAll(user.userId, query);
  }

  @Get(":id")
  async findOne(@CurrentUser() user, @Param("id") id: string) {
    return this.portfolioService.findOne(user.userId, id);
  }

  @Put(":id")
  async update(
    @CurrentUser() user,
    @Param("id") id: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.update(user.userId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user, @Param("id") id: string) {
    return this.portfolioService.delete(user.userId, id);
  }

  @Post(":id/assets")
  @HttpCode(HttpStatus.CREATED)
  async addAsset(
    @CurrentUser() user,
    @Param("id") id: string,
    @Body() dto: AddAssetDto,
  ) {
    return this.portfolioService.addAsset(user.userId, id, dto);
  }

  @Delete(":id/assets/:assetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAsset(
    @CurrentUser() user,
    @Param("id") id: string,
    @Param("assetId") assetId: string,
  ) {
    return this.portfolioService.removeAsset(user.userId, id, assetId);
  }

  @Get(":id/valuation")
  async getValuation(@CurrentUser() user, @Param("id") id: string) {
    return this.portfolioService.getValuation(user.userId, id);
  }
}
