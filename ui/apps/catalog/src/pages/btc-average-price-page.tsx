import type { JSX } from 'react'
import { BtcAveragePrice } from '@tetherto/mdk-react-devkit/core'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

import './btc-average-price-page.scss'

type PriceCaseProps = {
  inputLabel: string
  price?: number | null
}

const PriceCase = ({ inputLabel, price }: PriceCaseProps): JSX.Element => (
  <div className="btc-average-price-page__case">
    <p className="btc-average-price-page__case-label">{inputLabel}</p>
    <BtcAveragePrice price={price} />
  </div>
)

export const BtcAveragePricePage = (): JSX.Element => (
  <section className="demo-section btc-average-price-page">
    <DemoPageHeader
      title="BTC Average Price"
      description="Read-only BTC average price label for financial reporting toolbars."
    />

    <div className="btc-average-price-page__content">
      <DemoBlock title="Default">
        <PriceCase inputLabel="price={97_500}" price={97_500} />
      </DemoBlock>

      <DemoBlock title="Large value">
        <PriceCase inputLabel="price={123_456_789}" price={123_456_789} />
      </DemoBlock>

      <DemoBlock title="Zero">
        <PriceCase inputLabel="price={0}" price={0} />
      </DemoBlock>

      <DemoBlock
        title="Invalid price"
        description="Each row shows the prop passed in; invalid values display - for the amount."
      >
        <div className="btc-average-price-page__variants">
          <PriceCase inputLabel="price (null)" price={null} />
          <PriceCase inputLabel="price (undefined)" />
          <PriceCase inputLabel="price (NaN)" price={Number.NaN} />
          <PriceCase inputLabel="price (-1)" price={-1} />
        </div>
      </DemoBlock>
    </div>
  </section>
)
