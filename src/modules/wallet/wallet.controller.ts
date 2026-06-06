import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { DepositDto } from './dto/deposit.dto'
import { WithdrawDto } from './dto/withdraw.dto'
import { ExchangeDto } from './dto/exchange.dto'

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallets(@CurrentUser() user) {
    return this.walletService.getWallets(user.userId)
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  async deposit(@CurrentUser() user, @Body() dto: DepositDto) {
    return this.walletService.deposit({ userId: user.userId, ...dto })
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(@CurrentUser() user, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw({ userId: user.userId, ...dto })
  }

  @Post('exchange')
  @HttpCode(HttpStatus.CREATED)
  async exchange(@CurrentUser() user, @Body() dto: ExchangeDto) {
    return this.walletService.exchange({ userId: user.userId, ...dto })
  }
}
