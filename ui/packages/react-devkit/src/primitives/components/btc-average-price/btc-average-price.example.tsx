/**
 * Runnable example for BtcAveragePrice.
 */
import { BtcAveragePrice } from '@tetherto/mdk-react-devkit'

export const BtcAveragePriceExample = () => (
  <div className="mdk-example-col">
    <BtcAveragePrice price={97_500} />
    <BtcAveragePrice price={null} />
  </div>
)
