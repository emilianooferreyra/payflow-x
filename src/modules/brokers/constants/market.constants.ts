// Derechos de mercado BYMA para renta variable (acciones y CEDEARs):
// 0,05% sobre el monto operado (3 bps negociación + 2 bps post-trade),
// vigente desde 2025-10-01. Se cobran en compra Y en venta, más IVA.
// Fuente: https://www.byma.com.ar/newsroom/aranceles-de-rv
export const MARKET_META = {
  marketRightsPct: 0.05,
  ivaPct: 21,
  marketRightsSource: {
    label: "BYMA — Aranceles de Renta Variable (vigente 01/10/2025)",
    url: "https://www.byma.com.ar/newsroom/aranceles-de-rv",
  },
} as const;
