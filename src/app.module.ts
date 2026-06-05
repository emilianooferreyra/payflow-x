import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "./modules/prisma/prisma.module";
import KeyvRedis from "@keyv/redis";
import { envs } from "./config";
import { UsersModule } from "./modules/users/users.module";
import { TestModule } from "./modules/test/test.module";
import { HashModule } from "./modules/hash/hash.module";
import { HashService } from "./modules/hash/hash.service";
import { SessionModule } from "./modules/session/session.module";

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        return: {
          ttl: 5000, // Cache items expire after 60 seconds
          stores: [new KeyvRedis(envs.REDIS_URL)],
        },
      }),
    }),
    PrismaModule,
    UsersModule,
    TestModule,
    HashModule,
    SessionModule,
  ],
  controllers: [],
  providers: [HashService],
})
export class AppModule {}
