import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PrismaModule } from "./modules/prisma/prisma.module";
import KeyvRedis from "@keyv/redis";
import { envs } from "./config";

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
