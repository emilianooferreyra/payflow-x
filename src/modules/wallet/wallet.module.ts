import { Module } from '@nestjs/common'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { PrismaModule } from '../prisma/prisma.module'
import { KycModule } from '../kyc/kyc.module'

@Module({
  imports: [PrismaModule, KycModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
