import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "./modules/prisma/prisma.module";
import KeyvRedis from "@keyv/redis";
import { envs } from "./config";
import { UsersModule } from "./modules/users/users.module";
import { TestModule } from "./modules/test/test.module";
import { HashModule } from "./modules/hash/hash.module";
import { SessionModule } from "./modules/session/session.module";
import { TokensModule } from './modules/tokens/tokens.module';
import { EmailsModule } from './modules/emails/emails.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        ttl: 5000,
        stores: [new KeyvRedis(envs.REDIS_URL)],
      }),
    }),
    PrismaModule,
    UsersModule,
    TestModule,
    HashModule,
    SessionModule,
    TokensModule,
    EmailsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
