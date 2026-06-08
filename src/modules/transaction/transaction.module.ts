import { Module } from "@nestjs/common";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";

@Module({
  imports: [PrismaModule, KycModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
