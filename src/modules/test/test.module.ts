import { Module } from "@nestjs/common";
import { TestController } from "./test.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [TestController],
})
export class TestModule {}
