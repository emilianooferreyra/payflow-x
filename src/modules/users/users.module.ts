import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaModule } from "../prisma/prisma.module";
import { HashModule } from "../hash/hash.module";

@Module({
  imports: [PrismaModule, HashModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
