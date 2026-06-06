import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ExchangeRateService } from './exchange-rate.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { KycGuard } from '../kyc/guards/kyc.guard'
import { CurrencyEnum } from '../../generated/prisma/enums'

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, KycGuard)
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('current')
  async getCurrent() {
    return this.exchangeRateService.getCurrent()
  }

  @Get(':from/:to')
  async getRate(@Param('from') from: CurrencyEnum, @Param('to') to: CurrencyEnum) {
    return this.exchangeRateService.getRate(from, to)
  }

  @Get(':from/:to/history')
  async getHistory(@Param('from') from: CurrencyEnum, @Param('to') to: CurrencyEnum) {
    return this.exchangeRateService.getHistory(from, to)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh() {
    return this.exchangeRateService.refresh()
  }
}
