/**
 * Runnable example for CurrencyToggler.
 */
import { useState } from 'react'
import { CurrencyToggler } from '@tetherto/mdk-react-devkit'

export const CurrencyTogglerExample = () => {
  const [currency, setCurrency] = useState('USD')
  const [advancedCurrency, setAdvancedCurrency] = useState('BTC')

  return (
    <div className="mdk-example-col">
      <CurrencyToggler currencies={['USD', 'BTC', 'ETH']} value={currency} onChange={setCurrency} />

      <CurrencyToggler
        currencies={[
          { value: 'BTC', label: 'BTC' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR', disabled: true },
        ]}
        value={advancedCurrency}
        onChange={setAdvancedCurrency}
      />
    </div>
  )
}
