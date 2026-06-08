import { Module } from "@nestjs/common";
import { KycController } from "./kyc.controller";
import { KycService } from "./kyc.service";
import { KycGuard } from "./guards/kyc.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [KycController],
  providers: [KycService, KycGuard],
  exports: [KycService, KycGuard],
})
export class KycModule {}
