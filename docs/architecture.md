# PayFlow — Architecture Overview

## Stack

### Backend
- **NestJS** + **TypeScript**
- **PostgreSQL** + **Prisma ORM** (Multi-Schema)
- **Redis** — token caching, OTP expiration
- **Passport.js** — authentication strategies
- **JWT** + **OAuth 2.0**
- **Argon2** — password hashing
- **Swagger/OpenAPI** — auto-generated docs at `/api/docs`
- **Docker** — local and production environments

### Frontend
- **Next.js** + **React** + **TypeScript**
- **Tailwind CSS** + **Shadcn/UI**
- **TanStack Query** — server state management
- **Axios** — HTTP client
- **React Hook Form** + **Zod** — typed forms and validation

### External Services
- **Cloudinary** — image and avatar management
- **Resend** — transactional email delivery

---

## Authentication Features

### Session Management
Each session is stored in the database with: user agent, IP address, geographic location, session status, and expiration date. Users can view and revoke active sessions from their dashboard.

### Refresh Token Rotation
Enterprise-grade rotation: each refresh generates a new token, invalidates the previous one, and prevents reuse of compromised tokens.

### Instant Revocation
Access tokens depend on an active session in the database. If a session is deleted, the user loses access immediately — no need to wait for JWT expiration.

### Security Practices
- Argon2 password hashing
- HttpOnly + Secure cookies
- CSRF protection
- Zod validation
- OWASP best practices
- Automatic token refresh
- Session theft protection

### Two-Factor Authentication (2FA)
TOTP-compatible with Google Authenticator, Authy, Microsoft Authenticator, and standard TOTP apps. Implemented with `otplib` (RFC 6238) + `qrcode` for QR generation.

### Multi-Provider OAuth
Users can link multiple authentication methods (email/password, Google OAuth, future providers) to a single account profile.

### Avatar Management
Direct upload to Cloudinary via backend-generated signatures — reduces server load, improves performance and scalability.

### Password Recovery
Full flow: 6-digit OTP code → Redis with auto-expiration → secure validation → password reset.

---

## Project Structure

### Backend (`src/`)
```
src/
├── config/         # Environment and app configuration
├── database/       # Prisma client and migrations
├── integrations/   # Cloudinary, Resend, external services
└── modules/        # Domain-based feature modules
```

Key patterns: modular domain architecture, dependency injection, guards, interceptors, DTOs, centralized validation.

### Frontend (`features/`)
```
features/
├── auth/           # Login, register, 2FA, OAuth flows
├── profile/        # Avatar, display name, preferences
└── account/        # Sessions, security, linked providers
```

Key patterns: `SessionProvider`, `ProfileProvider`, Proxy Server Actions, TanStack Query, typed forms, centralized state management.

---

## Financial Features

### Multi-Currency Wallet
Each user holds balances in ARS and USD. Deposits, withdrawals, and peer-to-peer transfers are simulated. Exchange between currencies uses a simulated daily rate.

### Transaction Engine
Every financial operation generates an immutable transaction record with: type (deposit, withdrawal, transfer, exchange, investment), amount, currency, status, description, and category.

### Investments
Users can buy and sell simulated assets: US tech stocks (AAPL, GOOGL, MSFT, NVDA), S&P 500 index, and gold. Each asset has a seeded price history with realistic daily variation. Portfolio tracks quantity, average buy price, and current P&L.

### Virtual Cards
Each user gets a simulated virtual card (international + local) with a masked number, expiration, and CVV. Cards can be frozen/unfrozen and have a simulated spending limit.

### Exchange Rates
Daily ARS/USD rates are seeded and updated via a background job simulation. Used for wallet conversions and investment valuations in ARS.

### Notifications
Email notifications via Resend for: large transactions, successful investments, login from new device, and card usage.

---

## Dashboard Pages

| Page | Description |
|---|---|
| `/dashboard` | Balance overview, portfolio summary, recent transactions |
| `/wallet` | ARS/USD balances, deposit/withdraw simulation |
| `/investments` | Asset catalog, portfolio, buy/sell simulation |
| `/transactions` | Full history with filters by type, currency, date |
| `/cards` | Virtual card display, freeze/unfreeze |
| `/transfer` | Simulated P2P transfer to another user |

---

## Data Models (Financial)

```
Wallet         — userId, currency (ARS|USD), balance
Transaction    — walletId, type, amount, currency, status, description, category, metadata
Asset          — symbol, name, type (stock|etf|commodity), currentPrice, dailyChange
Investment     — userId, assetId, quantity, avgBuyPrice, currentValue
Card           — userId, type (international|local), maskedNumber, expiresAt, isActive
ExchangeRate   — fromCurrency, toCurrency, rate, date
```

---

## Infrastructure

Docker configuration covers local development and production, including PostgreSQL and Redis services.
