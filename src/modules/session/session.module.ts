import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { SessionService } from "./session.service";
import { SessionController } from "./session.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
