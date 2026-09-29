# PayFlow — Arquitectura Futura

Decisiones arquitectónicas conscientes tomadas para el MVP, con descripción de lo que se implementaría en un sistema productivo real.

---

## Fase 2 — Contabilidad y Trazabilidad

### Double-Entry Ledger

**Por qué no está en el MVP:**
El balance directo en `Wallet.balance` es suficiente para demostrar el flujo, pero no es la fuente de verdad correcta para producción.

**Qué agregaría:**
```prisma
model Account {
  id     String          @id @default(uuid())
  userId String
  type   AccountTypeEnum // CASH | ASSET | LIABILITY | REVENUE | EXPENSE
  ledgerEntries LedgerEntry[]
}

model LedgerEntry {
  id            String  @id @default(uuid())
  accountId     String
  transactionId String
  amount        Decimal @db.Decimal(18, 2)
  createdAt     DateTime @default(now())
}

enum AccountTypeEnum {
  CASH
  ASSET
  LIABILITY
  REVENUE
  EXPENSE
}
```

**Beneficios:**
- El balance se reconstruye desde el historial, nunca se modifica directamente
- Trazabilidad completa para auditorías regulatorias
- Prevención de race conditions en actualizaciones concurrentes de saldo
- Cumplimiento con GAAP / IFRS

---

### Sistema de Cuentas Separado

En producción, `Wallet` y `Account` son conceptos distintos. Una wallet es la interfaz del usuario; una account es el registro contable interno. Separar ambos permite:
- Múltiples wallets apuntando a la misma cuenta contable
- Subaccounts por producto (savings, checking, crypto)
- Conciliación automática con bancos y proveedores

---

## Fase 3 — Crypto y Blockchain

### Wallet Addresses

Para soportar USDT, USDC, BTC, ETH con direcciones reales:

```prisma
model WalletAddress {
  id       String               @id @default(uuid())
  walletId String
  network  BlockchainNetworkEnum
  address  String               @unique
}

enum BlockchainNetworkEnum {
  ETHEREUM
  TRON
  POLYGON
  SOLANA
}
```

**Integración:** Circle, Fireblocks, o Alchemy para custody y broadcasting de transacciones.

---

## Fase 3 — Compliance y KYC Avanzado

### KYC con Documentos

```prisma
model KycDocument {
  id          String @id @default(uuid())
  kycId       String
  frontImage  String // URL a storage (S3/Cloudinary)
  backImage   String
  selfieImage String
}
```

**Campos adicionales en KycVerification:**
```prisma
documentNumber String?
birthDate      DateTime?
nationality    String?
```

**Integración:** Jumio, Onfido, o Truora para verificación automatizada de documentos y liveness check.

---

## Fase 3 — Notificaciones

```prisma
model Notification {
  id     String               @id @default(uuid())
  userId String
  type   NotificationTypeEnum
  title  String
  body   String
  read   Boolean              @default(false)
  createdAt DateTime          @default(now())
}

enum NotificationTypeEnum {
  DEPOSIT_RECEIVED
  WITHDRAWAL_COMPLETED
  TRANSFER_RECEIVED
  KYC_APPROVED
  KYC_REJECTED
  CARD_FROZEN
  LOGIN_NEW_DEVICE
  INVESTMENT_UPDATE
}
```

**Delivery:** Push (FCM/APNs), email (Resend), in-app via WebSockets.

---

## Fase 4 — Crecimiento

### Sistema de Referidos

```prisma
model Referral {
  id         String   @id @default(uuid())
  referrerId String
  referredId String?
  code       String   @unique
  reward     Decimal? @db.Decimal(18, 2)
  createdAt  DateTime @default(now())
}
```

### Beneficiarios Frecuentes

```prisma
model Beneficiary {
  id            String @id @default(uuid())
  userId        String
  name          String
  bankName      String
  accountNumber String
  country       String
}
```

---

## Fase 4 — Fondos Bloqueados

Separar balance disponible del bloqueado para soportar:
- Retiros pendientes de confirmación
- Compras en proceso
- Compliance holds

```prisma
model Wallet {
  availableBalance Decimal @db.Decimal(18, 2)
  lockedBalance    Decimal @default(0) @db.Decimal(18, 2)
}
```

**Regla:** `totalBalance = availableBalance + lockedBalance`

---

## Fase 5 — Webhooks e Integraciones

```prisma
model WebhookEvent {
  id        String   @id @default(uuid())
  provider  String   // stripe | circle | wise
  eventType String
  payload   Json
  processed Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**Proveedores objetivo:** Stripe (pagos), Circle (stablecoins), Wise (transferencias internacionales), Airwallex (multi-currency).

---

## Regla Principal

> **Nunca tratar `Wallet.balance` como la fuente de verdad absoluta en producción.**
>
> El balance debe poder reconstruirse en cualquier momento desde el historial de `LedgerEntry`. El campo `balance` es una caché de lectura rápida, no el registro contable.

---

## Inspiración Arquitectónica

| Empresa | Referencia |
|---|---|
| Wise | Multi-currency accounts, borderless banking |
| Revolut | Crypto wallets, exchange engine, card management |
| Mercury | Business accounts, double-entry ledger |
| Brex | Spending limits, card tokenization |
| Takenos | Inversiones en ARS/USD, rendimientos diarios |
| Belo | Crypto + fiat en una misma app |
| Lemon Cash | USDT, staking, cashback en crypto |
