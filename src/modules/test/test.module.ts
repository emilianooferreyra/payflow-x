import { Module } from "@nestjs/common";
import { TestController } from "./test.controller";
import { TokensModule } from "../tokens/tokens.module";

@Module({
  imports: [TokensModule],
  controllers: [TestController],
})
export class TestModule {}
