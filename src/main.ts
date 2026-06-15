import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { envs } from "./config";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import {
  LoggingInterceptor,
  ResponseSerializationInterceptor,
} from "./common/interceptors";

async function bootstrap() {
  const logger = new Logger("PayFlow");

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  app.enableShutdownHooks();

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.enableCors({
    origin: envs.ALLOWED_ORIGINS,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseSerializationInterceptor(),
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
    .addTag(
      "Wallet",
      "Multi-currency wallets, deposits, withdrawals and exchanges",
    )
    .addTag("Transactions", "Transaction history and details")
    .addTag("Investments", "Asset catalog and portfolio management")
    .addTag("Cards", "Virtual card management")
    .addTag("Exchange Rates", "Currency exchange rates")
    .addTag("KYC", "Identity verification workflow")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(envs.PORT);
  logger.log(`App running on PORT: ${envs.PORT}`);
  logger.log(`Swagger docs at http://localhost:${envs.PORT}/api/docs`);
}

bootstrap().catch(console.error);
