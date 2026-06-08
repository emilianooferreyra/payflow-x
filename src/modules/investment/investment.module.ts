import { Module } from "@nestjs/common";
import { InvestmentController } from "./investment.controller";
import { InvestmentService } from "./investment.service";
import { PrismaModule } from "../prisma/prisma.module";
import { KycModule } from "../kyc/kyc.module";

@Module({
  imports: [PrismaModule, KycModule],
  controllers: [InvestmentController],
  providers: [InvestmentService],
  exports: [InvestmentService],
})
export class InvestmentModule {}
