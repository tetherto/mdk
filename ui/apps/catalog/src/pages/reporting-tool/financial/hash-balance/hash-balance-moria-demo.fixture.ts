import type { HashRevenueLogEntry } from '@tetherto/mdk-react-devkit/foundation'

export type MoriaHashBalanceMonthSnapshot = {
  hashRevenueUSDPerPHsPerDay: number
  networkHashPriceUSDPerPHsPerDay: number
  hashCostUSDPerPHsPerDay: number
  btcPrice: number
  networkHashrateMhs?: number
}

export const MORIA_HASH_BALANCE_MONTHLY: Record<number, MoriaHashBalanceMonthSnapshot[]> = {
  2025: [
    {
      hashRevenueUSDPerPHsPerDay: 0.36,
      networkHashPriceUSDPerPHsPerDay: 0.39,
      hashCostUSDPerPHsPerDay: 0.1,
      btcPrice: 62_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.37,
      networkHashPriceUSDPerPHsPerDay: 0.4,
      hashCostUSDPerPHsPerDay: 0.1,
      btcPrice: 63_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.38,
      networkHashPriceUSDPerPHsPerDay: 0.41,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 64_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.39,
      networkHashPriceUSDPerPHsPerDay: 0.42,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 64_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 65_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.41,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 65_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 66_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.39,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 66_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.38,
      networkHashPriceUSDPerPHsPerDay: 0.42,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 67_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.39,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 67_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 68_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.41,
      networkHashPriceUSDPerPHsPerDay: 0.45,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 68_500,
    },
  ],
  2026: [
    {
      hashRevenueUSDPerPHsPerDay: 0.38,
      networkHashPriceUSDPerPHsPerDay: 0.41,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 64_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.39,
      networkHashPriceUSDPerPHsPerDay: 0.42,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 64_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 65_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.41,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 66_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4221,
      networkHashPriceUSDPerPHsPerDay: 0.4613,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 67_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.43,
      networkHashPriceUSDPerPHsPerDay: 0.46,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 67_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.42,
      networkHashPriceUSDPerPHsPerDay: 0.45,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 68_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.41,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 68_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 69_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.39,
      networkHashPriceUSDPerPHsPerDay: 0.42,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 69_500,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.4,
      networkHashPriceUSDPerPHsPerDay: 0.43,
      hashCostUSDPerPHsPerDay: 0.11,
      btcPrice: 70_000,
    },
    {
      hashRevenueUSDPerPHsPerDay: 0.41,
      networkHashPriceUSDPerPHsPerDay: 0.44,
      hashCostUSDPerPHsPerDay: 0.12,
      btcPrice: 70_500,
    },
  ],
}

const noonUtc = (year: number, month: number): number => Date.UTC(year, month - 1, 15, 12, 0, 0, 0)

const DEFAULT_NETWORK_HASHRATE_MHS = 36_000_000_000_000

export const buildMoriaStyleLogEntry = (
  year: number,
  month: number,
  snapshot: MoriaHashBalanceMonthSnapshot,
): HashRevenueLogEntry => {
  const {
    hashRevenueUSDPerPHsPerDay,
    networkHashPriceUSDPerPHsPerDay,
    hashCostUSDPerPHsPerDay,
    btcPrice,
    networkHashrateMhs = DEFAULT_NETWORK_HASHRATE_MHS,
  } = snapshot

  const hashRevenueBTCPerPHsPerDay = hashRevenueUSDPerPHsPerDay / btcPrice
  const hashCostBTCPerPHsPerDay = hashCostUSDPerPHsPerDay / btcPrice
  const networkHashPriceBTCPerPHsPerDay = networkHashPriceUSDPerPHsPerDay / btcPrice

  const revenueUSD = hashRevenueUSDPerPHsPerDay * 900
  const feesUSD = revenueUSD * 0.18
  const revenueBTC = revenueUSD / btcPrice
  const feesBTC = feesUSD / btcPrice

  return {
    ts: noonUtc(year, month),
    revenueBTC,
    feesBTC,
    revenueUSD,
    feesUSD,
    btcPrice,
    hashrateMhs: 900_000_000,
    hashRevenueBTCPerPHsPerDay,
    hashRevenueUSDPerPHsPerDay,
    hashCostBTCPerPHsPerDay,
    hashCostUSDPerPHsPerDay,
    networkHashPriceBTCPerPHsPerDay,
    networkHashPriceUSDPerPHsPerDay,
    networkHashrateMhs,
  }
}

export const buildMoriaStyleYearLog = (year: number): HashRevenueLogEntry[] => {
  const months = MORIA_HASH_BALANCE_MONTHLY[year]
  if (!months) return []

  const now = new Date()
  const lastMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12

  return months
    .slice(0, lastMonth)
    .map((snapshot, index) => buildMoriaStyleLogEntry(year, index + 1, snapshot))
}
