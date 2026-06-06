import { Module } from '@nestjs/common'
import { TransactionController } from './transaction.controller'
import { TransactionService } from './transaction.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
