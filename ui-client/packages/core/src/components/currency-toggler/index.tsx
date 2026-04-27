import * as React from 'react'

import { cn } from '../../utils'

type CurrencyItem = {
  value: string
  label?: string
  disabled?: boolean
}

type CurrencyTogglerProps = {
  value: string
  className?: string
  currencies: (string | CurrencyItem)[]
  onChange: (currency: string) => void
}

/**
 * CurrencyToggler component for switching between currencies
 *
 * @example
 * ```tsx
 * <CurrencyToggler
 *   currencies={['USD', 'BTC', 'ETH']}
 *   value="USD"
 *   onChange={(currency) => console.log(currency)}
 * />
 * ```
 *
 * @example
 * // With disabled items
 * ```tsx
 * <CurrencyToggler
 *   currencies={[
 *     { value: 'USD', label: 'USD' },
 *     { value: 'BTC', label: 'BTC', disabled: true },
 *   ]}
 *   value="USD"
 *   onChange={(currency) => console.log(currency)}
 * />
 * ```
 */
const CurrencyToggler = React.forwardRef<HTMLDivElement, CurrencyTogglerProps>(
  ({ currencies, value, onChange, className }, ref) => (
    <div ref={ref} className={cn('mdk_currency_toggler', className)}>
      {currencies.map((currency) => {
        const item = typeof currency === 'string' ? { value: currency, label: currency } : currency
        const label = item.label ?? item.value

        return (
          <button
            type="button"
            key={item.value}
            disabled={item.disabled}
            aria-label={`Select ${label} currency`}
            className={cn(
              'mdk_currency_toggler__button',
              value === item.value && 'mdk_currency_toggler__button--active',
            )}
            onClick={() => !item.disabled && onChange(item.value)}
          >
            {label}
          </button>
        )
      })}
    </div>
  ),
)

CurrencyToggler.displayName = 'CurrencyToggler'

export { CurrencyToggler }
