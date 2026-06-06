import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { envs } from "./config";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const logger = new Logger("App - Auth");

  const app = await NestFactory.create(AppModule);

  // app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.enableCors({
    origin: envs.ALLOWED_ORIGINS,
    credentials: true, // Permite cookies
    // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("PayFlow API")
    .setDescription(
      "Fintech platform API — multi-currency wallets, investments, KYC and exchange rates. Inspired by Takenos, Belo and Lemon Cash.",
    )
    .setVersion("1.0")
    .addCookieAuth("access_token")
    .addTag("Auth", "Registration, login, 2FA and password recovery")
    .addTag("Sessions", "Active session management")
    .addTag("Wallet", "Multi-currency wallets, deposits, withdrawals and exchanges")
    .addTag("Transactions", "Transaction history and details")
    .addTag("Investments", "Asset catalog and portfolio management")
    .addTag("Cards", "Virtual card management")
    .addTag("Exchange Rates", "Currency exchange rates")
    .addTag("KYC", "Identity verification workflow")
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  })

  await app.listen(envs.PORT);
  logger.log(`App running on PORT: ${envs.PORT}`);
}

bootstrap().catch(console.error);
