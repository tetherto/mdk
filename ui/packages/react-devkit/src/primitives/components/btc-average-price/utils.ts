import { FALLBACK, formatNumber } from '../../utils/format'

export const formatPriceValue = (price: number | null | undefined): string => {
  if (price == null || Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
    return FALLBACK
  }

  return `$${formatNumber(price, { maximumFractionDigits: 0 })}`
}
