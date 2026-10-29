import { forwardRef } from 'react'
import { cn } from '../../utils'

type CurrencyItem = {
  /** Option value (used for selection) */
  value: string
  /** Display label (defaults to `value`) */
  label?: string
  /** Disables this option */
  disabled?: boolean
}

type CurrencyTogglerProps = {
  /** Currently selected currency value */
  value: string
  /** Additional class for the root element */
  className?: string
  /** List of currency options */
  currencies: (string | CurrencyItem)[]
  /** Fired with the selected currency value when a button is clicked */
  onChange: (currency: string) => void
  /**
   * Stretch to the container's width, the options sharing it evenly (a tab bar)
   * @default false
   */
  fullWidth?: boolean
  /**
   * Each button's accessible name, from its label. Defaults to
   * "Select <label> currency"; pass your own when the options are not currencies
   */
  itemAriaLabel?: (label: string) => string
}

const currencyAriaLabel = (label: string): string => `Select ${label} currency`

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
 *
 * @example
 * // As a full-width tab bar of views
 * ```tsx
 * <CurrencyToggler
 *   fullWidth
 *   currencies={[{ value: 'site', label: 'Site' }, { value: 'unit', label: 'Per unit' }]}
 *   itemAriaLabel={(label) => `Show ${label}`}
 *   value={view}
 *   onChange={setView}
 * />
 * ```
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const CurrencyToggler = forwardRef<HTMLDivElement, CurrencyTogglerProps>(
  (
    {
      currencies,
      value,
      onChange,
      className,
      fullWidth = false,
      itemAriaLabel = currencyAriaLabel,
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'mdk_currency_toggler',
        fullWidth && 'mdk_currency_toggler--full-width',
        className,
      )}
    >
      {currencies.map((currency) => {
        const item = typeof currency === 'string' ? { value: currency, label: currency } : currency
        const label = item.label ?? item.value

        return (
          <button
            type="button"
            key={item.value}
            disabled={item.disabled}
            aria-label={itemAriaLabel(label)}
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
