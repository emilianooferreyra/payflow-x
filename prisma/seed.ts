import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import argon2 from 'argon2'
import dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter } as any)

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number, hour = 10): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0)
  return d
}

function randomBetween(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

function generateHistoricalRates(currentRate: number, days: number): number[] {
  const rates: number[] = [currentRate]
  for (let i = 1; i < days; i++) {
    const prev = rates[i - 1]
    const change = prev * 0.004 * (Math.random() * 2 - 1)
    rates.push(parseFloat((prev - change).toFixed(4)))
  }
  return rates.reverse()
}

async function fetchRates(): Promise<{ ARS: number; BRL: number }> {
  const key = process.env.EXCHANGE_RATE_API_KEY
  if (!key) {
    console.warn('⚠️  EXCHANGE_RATE_API_KEY not set — using fallback rates')
    return { ARS: 1350, BRL: 5.72 }
  }
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`)
    const data = (await res.json()) as any
    return { ARS: data.conversion_rates.ARS, BRL: data.conversion_rates.BRL }
  } catch {
    console.warn('⚠️  Failed to fetch exchange rates — using fallback')
    return { ARS: 1350, BRL: 5.72 }
  }
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...\n')

  const { ARS: usdToArs, BRL: usdToBrl } = await fetchRates()
  console.log(`📈 USD/ARS: ${usdToArs.toFixed(2)} | USD/BRL: ${usdToBrl.toFixed(2)}\n`)

  // ── Clean existing demo data ──────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email: 'emiliano@craftbeats.dev' } })
  if (existing) {
    await prisma.auditLog.deleteMany({ where: { userId: existing.id } })
    await prisma.investment.deleteMany({ where: { userId: existing.id } })
    await prisma.card.deleteMany({ where: { userId: existing.id } })
    await prisma.transaction.deleteMany({ where: { wallet: { userId: existing.id } } })
    await prisma.wallet.deleteMany({ where: { userId: existing.id } })
    await prisma.kycVerification.deleteMany({ where: { userId: existing.id } })
    await prisma.user.delete({ where: { id: existing.id } })
    console.log('🧹 Cleaned existing demo user\n')
  }
  // Delete all investments before assets to avoid FK constraint
  await prisma.investment.deleteMany({})
  await prisma.exchangeRate.deleteMany({})
  await prisma.asset.deleteMany({})

  // ── User ──────────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash('Demo1234!')

  const user = await prisma.user.create({
    data: {
      email: 'emiliano@craftbeats.dev',
      password: passwordHash,
      name: 'Emiliano',
      lastName: 'Ferreyra',
      country: 'AR',
      language: 'es-ES',
      emailConfirm: true,
    },
  })
  console.log(`✅ User: ${user.email}`)

  // ── KYC ───────────────────────────────────────────────────────────────────
  const kyc = await prisma.kycVerification.create({
    data: {
      userId: user.id,
      status: 'APPROVED',
      documentType: 'DNI',
      submittedAt: daysAgo(60),
      reviewedAt: daysAgo(58),
    },
  })
  console.log('✅ KYC: APPROVED')

  // ── Wallets ───────────────────────────────────────────────────────────────
  // Balances are calculated to match the transaction history below
  const usdWallet = await prisma.wallet.create({
    data: { userId: user.id, currency: 'USD', balance: 1842.50 },
  })
  const arsWallet = await prisma.wallet.create({
    data: { userId: user.id, currency: 'ARS', balance: 415000 },
  })
  const usdtWallet = await prisma.wallet.create({
    data: { userId: user.id, currency: 'USDT', balance: 1200 },
  })
  console.log('✅ Wallets: USD ($1,842.50) | ARS ($415,000) | USDT ($1,200)')

  // ── Exchange Rates (30 days) ──────────────────────────────────────────────
  const arsRates = generateHistoricalRates(usdToArs, 30)
  const brlRates = generateHistoricalRates(usdToBrl, 30)

  const exchangeRateData: { fromCurrency: string; toCurrency: string; rate: number; date: Date }[] = []
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    date.setHours(0, 0, 0, 0)

    exchangeRateData.push(
      { fromCurrency: 'USD', toCurrency: 'ARS', rate: arsRates[i], date },
      { fromCurrency: 'ARS', toCurrency: 'USD', rate: parseFloat((1 / arsRates[i]).toFixed(8)), date },
      { fromCurrency: 'USD', toCurrency: 'USDT', rate: 1.0002, date },
      { fromCurrency: 'USDT', toCurrency: 'USD', rate: 0.9998, date },
      { fromCurrency: 'USDT', toCurrency: 'ARS', rate: parseFloat((arsRates[i] * 0.9998).toFixed(4)), date },
      { fromCurrency: 'USD', toCurrency: 'BRL', rate: brlRates[i], date },
    )
  }
  await prisma.exchangeRate.createMany({ data: exchangeRateData as any })
  console.log('✅ Exchange rates: 30 days (USD/ARS, USD/USDT, USDT/ARS, USD/BRL)')

  // ── Transactions — 3 months of freelancer story ───────────────────────────
  //
  // Month -3: Recibe $2,000 de cliente → convierte → gasta
  // Month -2: Recibe $3,500 (retainer) → convierte → gasta
  // Month -1: Recibe $2,800 → convierte → ahorra en USDT
  // Diario:   YIELD en USD y USDT (0.01% y 0.008%)

  const txs: any[] = []

  // ── Month 3 ago ────────────────────────────────────────────────────────────
  const arsRate90 = arsRates[0]

  txs.push({
    walletId: usdWallet.id,
    type: 'DEPOSIT',
    amount: 2000,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Acme Creative Co. · Invoice INV-2026-0005',
    category: 'TRANSFER',
    createdAt: daysAgo(89),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: arsWallet.id,
    type: 'EXCHANGE',
    amount: 1000,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → ARS',
    metadata: { rate: arsRate90, received: (1000 * arsRate90).toFixed(2), toCurrency: 'ARS' },
    createdAt: daysAgo(88),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: usdtWallet.id,
    type: 'EXCHANGE',
    amount: 400,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → USDT',
    metadata: { rate: 1.0002, received: '400.08', toCurrency: 'USDT' },
    createdAt: daysAgo(88),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(75000, 95000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Retiro a CVU — Cuenta Mercado Pago',
    category: 'TRANSFER',
    createdAt: daysAgo(82),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: 45000,
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Alquiler — abril 2026',
    category: 'UTILITIES',
    createdAt: daysAgo(76),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(18000, 32000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Supermercado y varios',
    category: 'FOOD',
    createdAt: daysAgo(70),
  })

  // ── Month 2 ago ────────────────────────────────────────────────────────────
  const arsRate60 = arsRates[Math.floor(arsRates.length * 0.33)]

  txs.push({
    walletId: usdWallet.id,
    type: 'DEPOSIT',
    amount: 3500,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'TechForge Solutions · Invoice INV-2026-0009',
    category: 'TRANSFER',
    createdAt: daysAgo(59),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: arsWallet.id,
    type: 'EXCHANGE',
    amount: 1500,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → ARS',
    metadata: { rate: arsRate60, received: (1500 * arsRate60).toFixed(2), toCurrency: 'ARS' },
    createdAt: daysAgo(58),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: usdtWallet.id,
    type: 'EXCHANGE',
    amount: 800,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → USDT',
    metadata: { rate: 1.0002, received: '800.16', toCurrency: 'USDT' },
    createdAt: daysAgo(57),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(90000, 110000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Retiro a CVU — Cuenta Mercado Pago',
    category: 'TRANSFER',
    createdAt: daysAgo(52),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: 45000,
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Alquiler — mayo 2026',
    category: 'UTILITIES',
    createdAt: daysAgo(46),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(22000, 38000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Nafta y transporte',
    category: 'TRANSPORT',
    createdAt: daysAgo(41),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(15000, 25000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Salud — prepaga',
    category: 'HEALTH',
    createdAt: daysAgo(38),
  })

  // ── Month 1 ago ────────────────────────────────────────────────────────────
  const arsRate30 = arsRates[Math.floor(arsRates.length * 0.66)]

  txs.push({
    walletId: usdWallet.id,
    type: 'DEPOSIT',
    amount: 2800,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Nova Digital · Invoice INV-2026-0012',
    category: 'TRANSFER',
    createdAt: daysAgo(28),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: arsWallet.id,
    type: 'EXCHANGE',
    amount: 1000,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → ARS',
    metadata: { rate: arsRate30, received: (1000 * arsRate30).toFixed(2), toCurrency: 'ARS' },
    createdAt: daysAgo(27),
  })
  txs.push({
    walletId: usdWallet.id,
    toWalletId: usdtWallet.id,
    type: 'EXCHANGE',
    amount: 1000,
    currency: 'USD',
    status: 'COMPLETED',
    description: 'Conversión USD → USDT (ahorro)',
    metadata: { rate: 1.0002, received: '1000.20', toCurrency: 'USDT' },
    createdAt: daysAgo(26),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(85000, 105000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Retiro a CVU — Cuenta Mercado Pago',
    category: 'TRANSFER',
    createdAt: daysAgo(20),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: 45000,
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Alquiler — junio 2026',
    category: 'UTILITIES',
    createdAt: daysAgo(15),
  })
  txs.push({
    walletId: arsWallet.id,
    type: 'WITHDRAWAL',
    amount: randomBetween(20000, 35000),
    currency: 'ARS',
    status: 'COMPLETED',
    description: 'Entretenimiento y salidas',
    category: 'ENTERTAINMENT',
    createdAt: daysAgo(10),
  })

  // Retiro pendiente (hoy)
  txs.push({
    walletId: usdWallet.id,
    type: 'WITHDRAWAL',
    amount: 200,
    currency: 'USD',
    status: 'PENDING',
    description: 'Retiro USD — en proceso',
    createdAt: daysAgo(0),
  })

  await prisma.transaction.createMany({ data: txs as any })
  console.log(`✅ Transactions: ${txs.length} operations (3 months of history)`)

  // ── YIELD diario — 90 días ────────────────────────────────────────────────
  const YIELD_USD = 0.0001   // 0.01% diario ≈ 3.65% APY
  const YIELD_USDT = 0.00008 // 0.008% diario ≈ 2.9% APY

  const yieldTxs: any[] = []
  let usdRunning = 600
  let usdtRunning = 400

  for (let day = 89; day >= 0; day--) {
    const date = daysAgo(day, 0)
    date.setHours(0, 5, 0, 0)

    const usdYield = parseFloat((usdRunning * YIELD_USD).toFixed(4))
    const usdtYield = parseFloat((usdtRunning * YIELD_USDT).toFixed(4))

    if (usdYield > 0) {
      yieldTxs.push({
        walletId: usdWallet.id,
        type: 'YIELD',
        amount: usdYield,
        currency: 'USD',
        status: 'COMPLETED',
        description: 'Rendimiento diario USD',
        metadata: { rate: YIELD_USD, period: 'daily', apy: '3.65%' },
        createdAt: date,
      })
      usdRunning += usdYield
    }

    if (usdtYield > 0) {
      yieldTxs.push({
        walletId: usdtWallet.id,
        type: 'YIELD',
        amount: usdtYield,
        currency: 'USDT',
        status: 'COMPLETED',
        description: 'Rendimiento diario USDT',
        metadata: { rate: YIELD_USDT, period: 'daily', apy: '2.9%' },
        createdAt: date,
      })
      usdtRunning += usdtYield
    }
  }

  await prisma.transaction.createMany({ data: yieldTxs as any })
  console.log(`✅ Yield: ${yieldTxs.length} daily accruals (90 days × USD + USDT)`)

  // ── Assets ────────────────────────────────────────────────────────────────
  await prisma.asset.createMany({
    data: [
      { symbol: 'AAPL',  name: 'Apple Inc.',            type: 'STOCK',     currentPrice: 195.50, dailyChange:  1.24 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.',          type: 'STOCK',     currentPrice: 178.30, dailyChange: -0.43 },
      { symbol: 'NVDA',  name: 'NVIDIA Corporation',     type: 'STOCK',     currentPrice: 875.40, dailyChange:  3.71 },
      { symbol: 'MSFT',  name: 'Microsoft Corporation',  type: 'STOCK',     currentPrice: 418.20, dailyChange:  0.87 },
      { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',       type: 'ETF',       currentPrice: 548.60, dailyChange:  0.31 },
      { symbol: 'XAU',   name: 'Gold',                   type: 'COMMODITY', currentPrice: 3280.00, dailyChange: -0.15 },
    ],
  })
  console.log('✅ Assets: AAPL, GOOGL, NVDA, MSFT, SPY, Gold')

  const assetList = await prisma.asset.findMany({
    where: { symbol: { in: ['AAPL', 'NVDA', 'SPY', 'MSFT'] } },
  })
  const assetMap = Object.fromEntries(assetList.map((a) => [a.symbol, a]))

  // ── Investments (portfolio) ───────────────────────────────────────────────
  await prisma.investment.createMany({
    data: [
      {
        userId: user.id,
        assetId: assetMap['AAPL'].id,
        quantity: 3.5,
        avgBuyPrice: 182.00,
        currentValue: parseFloat((3.5 * 195.50).toFixed(2)),
      },
      {
        userId: user.id,
        assetId: assetMap['NVDA'].id,
        quantity: 0.8,
        avgBuyPrice: 720.00,
        currentValue: parseFloat((0.8 * 875.40).toFixed(2)),
      },
      {
        userId: user.id,
        assetId: assetMap['SPY'].id,
        quantity: 2.0,
        avgBuyPrice: 510.00,
        currentValue: parseFloat((2.0 * 548.60).toFixed(2)),
      },
      {
        userId: user.id,
        assetId: assetMap['MSFT'].id,
        quantity: 1.5,
        avgBuyPrice: 390.00,
        currentValue: parseFloat((1.5 * 418.20).toFixed(2)),
      },
    ],
  })
  console.log('✅ Portfolio: AAPL (3.5) | NVDA (0.8) | SPY (2.0) | MSFT (1.5)')

  // ── Card ──────────────────────────────────────────────────────────────────
  await prisma.card.create({
    data: {
      userId: user.id,
      type: 'INTERNATIONAL',
      maskedNumber: '**** **** **** 4829',
      expiresAt: new Date('2027-12-31'),
      network: 'VISA',
      issuer: 'PayFlow',
      cardToken: 'tok_demo_visa_4829',
      isActive: true,
      isFrozen: false,
      spendingLimit: 5000,
    },
  })
  console.log('✅ Card: VISA International *4829 (active)')

  // ── Audit Log ─────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: user.id, action: 'USER_REGISTER',   entity: 'User',            entityId: user.id,    createdAt: daysAgo(90) },
      { userId: user.id, action: 'KYC_SUBMITTED',   entity: 'KycVerification', entityId: kyc.id,     createdAt: daysAgo(60) },
      { userId: user.id, action: 'KYC_APPROVED',    entity: 'KycVerification', entityId: kyc.id,     createdAt: daysAgo(58) },
      { userId: user.id, action: 'WALLET_CREATED',  entity: 'Wallet',          entityId: usdWallet.id,  createdAt: daysAgo(90) },
      { userId: user.id, action: 'WALLET_CREATED',  entity: 'Wallet',          entityId: arsWallet.id,  createdAt: daysAgo(90) },
      { userId: user.id, action: 'WALLET_CREATED',  entity: 'Wallet',          entityId: usdtWallet.id, createdAt: daysAgo(89) },
      { userId: user.id, action: 'CARD_CREATED',    entity: 'Card',            entityId: user.id,    createdAt: daysAgo(85) },
    ],
  })
  console.log('✅ Audit log: 7 key events\n')

  await seedBrokers()

  console.log('🎉 Seed completed!')
  console.log('   📧 emiliano@craftbeats.dev  /  Demo1234!')
  console.log(`   💵 USD $1,842.50  |  ARS $415,000  |  USDT $1,200`)
  console.log(`   📊 Portfolio: ~$2,778 in stocks`)
  console.log(`   📈 90 days of daily yield accruals`)
}

// ── Brokers (comparador CEDEARs) ─────────────────────────────────────────────
// Tarifario curado a mano — plan base de cada broker. Verificado por Emi el
// 2026-07-14. Derechos de mercado BYMA (0,05%) e IVA (21%) viven en
// src/modules/brokers/constants/market.constants.ts, NO acá.

const BROKER_VERIFIED_AT = new Date('2026-07-14')

const BROKERS = [
  {
    slug: 'iol',
    name: 'IOL invertironline',
    feeBuyPct: 0.6,
    feeSellPct: 0.6,
    ivaOnFees: true,
    custodyNotes: 'Sin cargo (bonificada hasta cierto nivel patrimonial)',
    feeNotes: 'Operaciones intradiarias bonificadas 100%',
    sources: [
      { label: 'Tarifas oficiales IOL', url: 'https://www.invertironline.com/tarifas' },
      { label: 'Rankia (act. 30/04/2026)', url: 'https://www.rankia.com.ar/blog/analisis-merval/4309655-invertir-online-productos-comisiones-cotizaciones' },
    ],
  },
  {
    slug: 'balanz',
    name: 'Balanz',
    feeBuyPct: 0.5,
    feeSellPct: 0.5,
    ivaOnFees: true,
    custodyNotes: 'Sin cargo de apertura ni mantenimiento',
    feeNotes: 'Comisión máxima publicada (hasta 0,50%); intradía −50%',
    sources: [
      { label: 'Aranceles oficiales Balanz', url: 'https://balanz.com/comisiones/' },
      { label: 'Rankia (12/08/2025)', url: 'https://www.rankia.com.ar/blog/trading-argentina/6944904-tarifario-comisiones-balanz-capital' },
    ],
  },
  {
    slug: 'ppi',
    name: 'PPI — Portfolio Personal Inversiones',
    feeBuyPct: 0.6,
    feeSellPct: 0.6,
    feeMaxPct: 1.5,
    ivaOnFees: true,
    custodyNotes: 'Sin cargo de custodia ni mantenimiento',
    feeNotes: 'Rango 0,60%–1,50% según acuerdo; intradía bonifica la pata menor',
    sources: [
      { label: 'Comisiones oficiales PPI', url: 'https://portfoliopersonal.com/Contenido/comisiones' },
      { label: 'Rankia (20/09/2025)', url: 'https://www.rankia.com.ar/blog/trading-argentina/6986316-tarifario-comisiones-ppi' },
    ],
  },
  {
    slug: 'cocos',
    name: 'Cocos Capital',
    feeBuyPct: 0.45,
    feeSellPct: 0.45,
    ivaOnFees: true,
    custodyNotes: 'Gratis hasta USD 200.000; $1.000/mes hasta USD 300.000; proporcional CVSA por encima',
    feeNotes: 'Plan base. Cocos Gold (hasta 0,15% AUM/mes) y Pro (desde USD 150/mes) operan al 0%. Operador humano: 1%',
    sources: [
      { label: 'Tarifario oficial Cocos', url: 'https://cocos.capital/tarifario' },
      { label: 'Rankia (act. 05/2026)', url: 'https://www.rankia.com.ar/blog/trading-argentina/7336870-tarifario-comisiones-cocos-capital' },
    ],
  },
  {
    slug: 'bullmarket',
    name: 'Bull Market Brokers',
    feeBuyPct: 0.5,
    feeSellPct: 0.5,
    ivaOnFees: true,
    custodyNotes: 'Sin mantenimiento de cuenta',
    feeNotes: 'Cuenta Digital. Active Trader 0,25% / AT Plus 0,10% por volumen mensual; intradía −50%',
    sources: [
      { label: 'Guía oficial de comisiones', url: 'https://help.bullmarketbrokers.com/guia/comisiones/' },
    ],
  },
  {
    slug: 'iebmas',
    name: 'IEB+',
    feeBuyPct: 0,
    feeSellPct: 0,
    ivaOnFees: true,
    subscriptionMonthlyArs: 5000,
    subscriptionNotes: 'Plan Investor: $5.000 + IVA por mes, solo los meses en que operás mercado local. Plan Rookie (gratis) NO incluye acciones/CEDEARs',
    custodyNotes: 'Custodia incluida, mantenimiento bonificado',
    feeNotes: '0% de comisión por operación bajo modelo de suscripción',
    sources: [
      { label: 'Preguntas frecuentes IEB+', url: 'https://www.iebmas.com.ar/preguntas-frecuentes/' },
    ],
  },
]

async function seedBrokers() {
  for (const broker of BROKERS) {
    await prisma.broker.upsert({
      where: { slug: broker.slug },
      update: { ...broker, lastVerifiedAt: BROKER_VERIFIED_AT },
      create: { ...broker, lastVerifiedAt: BROKER_VERIFIED_AT },
    })
  }
  console.log(`✅ Brokers: ${BROKERS.length} tarifarios (verificados ${BROKER_VERIFIED_AT.toISOString().slice(0, 10)})\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
