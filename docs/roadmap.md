# PayFlow — Roadmap

## Backend — Completado

### Infraestructura

- [x] Setup Docker + pnpm + Node 22
- [x] Prisma v7 + PostgreSQL + Redis
- [x] Estructura modular NestJS
- [x] PrismaService con PrismaPg adapter
- [x] Config validation con Zod
- [x] main.ts (cookieParser, versioning, CORS, ValidationPipe)
- [x] HashModule + HashService (argon2)
- [x] TokensModule + TokensService (Redis — generateToken, validateToken, revokeToken)
- [x] EmailsModule con Resend SDK

### Auth

- [x] Estrategia local (email + password con Argon2)
- [x] JWT access token (15min) + refresh token rotation (hashed en DB)
- [x] Cookies HttpOnly/Secure para ambos tokens
- [x] POST /auth/register, /auth/login, /auth/logout, /auth/refresh
- [x] Google OAuth — vincular cuenta existente o crear nueva
- [x] 2FA con TOTP (otplib) — generate, enable, disable, verify + pending cookie flow
- [x] Password recovery — OTP 6 dígitos vía email (Redis 10min TTL)

### Sesiones

- [x] GET /sessions, DELETE /sessions/:id, DELETE /sessions
- [x] Guardar userAgent, IP, expiresAt por sesión

### Schema financiero

- [x] Wallet (multi-currency: USD, ARS, USDT, BRL — Decimal 18,2)
- [x] Transaction (toWalletId para transfers, tipos: DEPOSIT, WITHDRAWAL, TRANSFER, EXCHANGE, YIELD, INVESTMENT_BUY, INVESTMENT_SELL)
- [x] Asset, Investment (avgBuyPrice, currentValue — Decimal 18,8)
- [x] Card (sin CVV — cardToken, isFrozen, spendingLimit)
- [x] ExchangeRate, KycVerification, AuditLog

### Seed

- [x] demo@payflow.com / Demo1234! — KYC APPROVED
- [x] Wallets: USD $1,842.50 | ARS $415,000 | USDT $1,200
- [x] 3 meses de transacciones realistas + 180 acreditaciones de yield diario
- [x] Portfolio: AAPL, NVDA, SPY, MSFT con P&L
- [x] Exchange rates 30 días (USD/ARS real via API + variación diaria)
- [x] Tarjeta VISA *4829 activa

### Módulos financieros

- [x] WalletModule — GET /wallet, deposit, withdraw, exchange (atómico con $transaction)
- [x] TransactionModule — GET /transactions (paginado + filtros), GET /transactions/:id
- [x] InvestmentModule — GET /assets, GET /investments (P&L), buy, sell (avgBuyPrice ponderado)
- [x] CardModule — GET /cards, freeze, unfreeze
- [x] ExchangeRateModule — current, pair, history, refresh (desde exchangerate-api.com)
- [x] KycModule — state machine (PENDING→IN_REVIEW→APPROVED/REJECTED) + KycGuard en todos los endpoints financieros

### Swagger

- [x] SwaggerModule configurado en main.ts
- [x] CLI plugin — auto-genera schemas desde class-validator (sin @ApiProperty manual)
- [x] @ApiTags + @ApiCookieAuth en todos los controllers
- [ ] @ApiOperation + @ApiResponse en endpoints clave (login, wallet, exchange, investments, kyc)

---

## Backend — Pendiente

### Polish

- [x] Activar Helmet en main.ts
- [x] Rate limiting con @nestjs/throttler (60 req/min por IP)
- [x] Error handling global (GlobalExceptionFilter — JSON estructurado + logger)
- [x] .env.example completo y documentado

### Testing

- [ ] Test de integración: flujo de login completo
- [ ] Test de integración: deposit + exchange + balance check

---

## Frontend — Pendiente

### Setup

- [ ] Crear `payflow-web` con Next.js + TypeScript
- [ ] Tailwind CSS + Shadcn/UI
- [ ] TanStack Query + Axios
- [ ] React Hook Form + Zod

### Auth pages

- [ ] /login — email + password + Google OAuth button
- [ ] /register — formulario completo
- [ ] /forgot-password — email → OTP → nuevo password
- [ ] /2fa — pantalla de verificación TOTP
- [ ] Middleware de protección de rutas

### Dashboard (/dashboard)

- [ ] Layout con sidebar (Dashboard, Wallet, Investments, Transactions, Cards)
- [ ] Balance total en USD + desglose por wallet
- [ ] Portfolio summary — valor total + P&L del día
- [ ] Últimas 5 transacciones
- [ ] Quick actions — Depositar, Convertir, Invertir

### Wallet (/wallet)

- [ ] Cards de saldo por moneda (USD, ARS, USDT)
- [ ] Modal: Depositar
- [ ] Modal: Convertir con tasa en tiempo real
- [ ] Gráfico de balance últimos 30 días

### Investments (/investments)

- [ ] Tabla de assets con precio y variación 24h
- [ ] Portfolio — mis posiciones con P&L
- [ ] Modal: Comprar / Vender

### Transactions (/transactions)

- [ ] Tabla paginada con filtros (tipo, moneda, fecha)

### Cards (/cards)

- [ ] Tarjeta virtual con número enmascarado, vencimiento, red
- [ ] Botón freeze/unfreeze

---

## Deploy

- [ ] Backend en Railway o Render
- [ ] Frontend en Vercel
- [ ] .env de producción configurado
- [ ] URL pública funcionando con datos demo

---

## README

- [ ] Descripción + motivación del proyecto
- [ ] Decisiones arquitectónicas clave
- [ ] Setup local (5 comandos)
- [ ] Link al deploy + Swagger docs

---

## Stack

| Servicio             | Propósito                          | Tier                    |
| -------------------- | ---------------------------------- | ----------------------- |
| Resend               | Emails transaccionales             | Gratuito (3k/mes)       |
| exchangerate-api.com | Tasas de cambio reales             | Gratuito (1.5k req/mes) |
| KYC                  | Flujo simulado (estados en DB)     | —                       |

## Depósitos — decisión de arquitectura

Stripe no aplica al modelo de negocio de una fintech de wallets. Los métodos reales son:

- Transferencias bancarias (CBU/CVU) — el usuario transfiere desde su banco, la plataforma acredita el saldo
- Coelsa / Interbanking — para procesar transferencias en ARS en Argentina
- Stablecoins on-chain — para recibir USDT directamente en una wallet de custodia

El `POST /wallet/deposit` simulado representa este flujo correctamente para el portfolio.
