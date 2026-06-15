import { BTC_AVERAGE_PRICE } from './constants'
import { formatPriceValue } from './utils'

export type BtcAveragePriceProps = Partial<{
  /**
   * BTC price in USD; formatted with grouping and no decimal places.
   * When `null`, `undefined`, non-finite, or negative, the value shows `-` (`FALLBACK` from format utils).
   */
  price: number | null
  /**
   * Label for the BTC average price.
   */
  label: string
}>

/**
 * Read-only BTC average price label for reporting toolbars.
 *
 * @example
 * ```tsx
 * <BtcAveragePrice price={97_500} />
 * ```
 * @category display
 * @domain generic
 * @tier agent-ready
 */
export const BtcAveragePrice = ({
  price,
  label = BTC_AVERAGE_PRICE.LABEL,
}: BtcAveragePriceProps) => (
  <div className="mdk-btc-average-price">
    <span className="mdk-btc-average-price__header">{`${label}${BTC_AVERAGE_PRICE.SUFFIX}`}</span>
    <span className="mdk-btc-average-price__value">{formatPriceValue(price)}</span>
  </div>
)
