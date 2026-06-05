import { Module } from "@nestjs/common";
import { TestController } from "./test.controller";
import { TokensModule } from "../tokens/tokens.module";
import { EmailsModule } from "../emails/emails.module";

@Module({
  imports: [EmailsModule, TokensModule],
  controllers: [TestController],
})
export class TestModule {}
