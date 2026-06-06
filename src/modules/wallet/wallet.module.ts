import { Module } from '@nestjs/common'
import { WalletController } from './wallet.controller.js'
import { WalletService } from './wallet.service.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
