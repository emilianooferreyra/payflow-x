import { Module } from '@nestjs/common'
import { InvestmentController } from './investment.controller'
import { InvestmentService } from './investment.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [InvestmentController],
  providers: [InvestmentService],
  exports: [InvestmentService],
})
export class InvestmentModule {}
