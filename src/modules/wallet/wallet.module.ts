import { Module } from '@nestjs/common'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
