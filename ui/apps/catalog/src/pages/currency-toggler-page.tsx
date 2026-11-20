import { useState } from 'react'
import type { JSX } from 'react'
import { CurrencyToggler } from '@tetherto/mdk-react-devkit/primitives'

export const CurrencyTogglerPage = (): JSX.Element => {
  const [currency1, setCurrency1] = useState('USD')
  const [currency2, setCurrency2] = useState('BTC')

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Currency Toggler</h2>
      <div className="demo-section__column demo-section__column--tight">
        <div>
          <p className="demo-section__label">USD / BTC</p>
          <CurrencyToggler currencies={['USD', 'BTC']} value={currency1} onChange={setCurrency1} />
        </div>
        <div>
          <p className="demo-section__label">BTC / SAT</p>
          <CurrencyToggler currencies={['BTC', 'SAT']} value={currency2} onChange={setCurrency2} />
        </div>
        <div>
          <p className="demo-section__label">With Disabled</p>
          <CurrencyToggler
            currencies={[
              { value: 'Active', label: 'Active' },
              { value: 'Disabled', label: 'Disabled', disabled: true },
            ]}
            value="Active"
            onChange={() => {}}
          />
        </div>
      </div>
    </section>
  )
}
