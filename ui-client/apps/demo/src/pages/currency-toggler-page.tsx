import { useState } from 'react'
import { CurrencyToggler } from '@tetherto/mdk-core-ui'

export const CurrencyTogglerPage = (): JSX.Element => {
  const [currency1, setCurrency1] = useState('USD')
  const [currency2, setCurrency2] = useState('BTC')

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Currency Toggler</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <p style={{ marginBottom: '0.5rem', fontSize: '13px', opacity: 0.7 }}>USD / BTC</p>
          <CurrencyToggler currencies={['USD', 'BTC']} value={currency1} onChange={setCurrency1} />
        </div>
        <div>
          <p style={{ marginBottom: '0.5rem', fontSize: '13px', opacity: 0.7 }}>BTC / SAT</p>
          <CurrencyToggler currencies={['BTC', 'SAT']} value={currency2} onChange={setCurrency2} />
        </div>
        <div>
          <p style={{ marginBottom: '0.5rem', fontSize: '13px', opacity: 0.7 }}>With Disabled</p>
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
