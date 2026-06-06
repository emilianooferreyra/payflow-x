import { Module } from '@nestjs/common'
import { CardController } from './card.controller'
import { CardService } from './card.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PassportModule } from '@nestjs/passport'

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
