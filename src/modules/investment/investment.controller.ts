import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { InvestmentService } from './investment.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { KycGuard } from '../kyc/guards/kyc.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { BuyAssetDto } from './dto/buy-asset.dto'
import { SellAssetDto } from './dto/sell-asset.dto'

@Controller('investments')
@UseGuards(JwtAuthGuard, KycGuard)
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get('assets')
  async getAssets() {
    return this.investmentService.getAssets()
  }

  @Get()
  async getPortfolio(@CurrentUser() user) {
    return this.investmentService.getPortfolio(user.userId)
  }

  @Post('buy')
  @HttpCode(HttpStatus.CREATED)
  async buy(@CurrentUser() user, @Body() dto: BuyAssetDto) {
    return this.investmentService.buy({ userId: user.userId, ...dto })
  }

  @Post('sell')
  @HttpCode(HttpStatus.CREATED)
  async sell(@CurrentUser() user, @Body() dto: SellAssetDto) {
    return this.investmentService.sell({ userId: user.userId, ...dto })
  }
}
