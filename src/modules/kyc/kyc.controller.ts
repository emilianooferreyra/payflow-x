import { ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { KycService } from './kyc.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SubmitKycDto } from './dto/submit-kyc.dto'
import { ReviewKycDto } from './dto/review-kyc.dto'

@ApiTags('KYC')
@ApiCookieAuth()
@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  async getStatus(@CurrentUser() user) {
    return this.kycService.getStatus(user.userId)
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submit(@CurrentUser() user, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(user.userId, dto.documentType)
  }

  @Post('review')
  @HttpCode(HttpStatus.OK)
  async review(@CurrentUser() user, @Body() dto: ReviewKycDto) {
    return this.kycService.review(user.userId, dto.action)
  }
}
