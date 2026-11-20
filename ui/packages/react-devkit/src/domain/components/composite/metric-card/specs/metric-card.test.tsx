import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { COLOR, FALLBACK } from '@primitives'
import { MetricCard } from '../index'

describe('MetricCard', () => {
  describe('rendering', () => {
    it('renders the wrapper with the base class', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      expect(container.querySelector('.mdk-metric-card')).toBeInTheDocument()
    })

    it('renders the label and label class', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      expect(screen.getByText('Hashrate')).toBeInTheDocument()
      expect(container.querySelector('.mdk-metric-card__label')).toBeInTheDocument()
    })

    it('renders the value wrapper with the value class', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      expect(container.querySelector('.mdk-metric-card__value')).toBeInTheDocument()
    })
  })

  describe('noMinWidth', () => {
    it('does not apply the no-min-width modifier by default', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      expect(container.querySelector('.mdk-metric-card--no-min-width')).not.toBeInTheDocument()
    })

    it('applies the no-min-width modifier when noMinWidth=true', () => {
      const { container } = render(
        <MetricCard label="Hashrate" unit="TH/s" value={102.4} noMinWidth />,
      )

      expect(container.querySelector('.mdk-metric-card--no-min-width')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('merges a custom className alongside the base class', () => {
      const { container } = render(
        <MetricCard label="Hashrate" unit="TH/s" value={102.4} className="extra" />,
      )

      const root = container.querySelector('.mdk-metric-card')
      expect(root).toHaveClass('extra')
    })
  })

  describe('bgColor / CSS variable', () => {
    it('falls back to COLOR.BLACK_ALPHA_05 when bgColor is omitted', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      const root = container.querySelector('.mdk-metric-card') as HTMLElement
      expect(root.style.getPropertyValue('--mdk-metric-card-bg')).toBe(COLOR.BLACK_ALPHA_05)
    })

    it('uses a provided bgColor when given', () => {
      const { container } = render(
        <MetricCard label="Hashrate" unit="TH/s" value={102.4} bgColor="#123456" />,
      )

      const root = container.querySelector('.mdk-metric-card') as HTMLElement
      expect(root.style.getPropertyValue('--mdk-metric-card-bg')).toBe('#123456')
    })
  })

  describe('isValueMedium', () => {
    it('does not apply the medium modifier by default', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      expect(container.querySelector('.mdk-metric-card__value--medium')).not.toBeInTheDocument()
    })

    it('applies the medium modifier when isValueMedium=true', () => {
      const { container } = render(
        <MetricCard label="Hashrate" unit="TH/s" value={102.4} isValueMedium />,
      )

      expect(container.querySelector('.mdk-metric-card__value--medium')).toBeInTheDocument()
    })
  })

  describe('value colour selection', () => {
    const renderValue = (props: Partial<Parameters<typeof MetricCard>[0]> = {}): HTMLElement => {
      const { container } = render(
        <MetricCard label="Hashrate" unit="TH/s" value={102.4} {...props} />,
      )
      return container.querySelector('.mdk-metric-card__value') as HTMLElement
    }

    it('uses the default colour when neither highlight nor transparent is set', () => {
      const valueEl = renderValue()
      expect(valueEl).not.toHaveClass('mdk-metric-card__value--highlighted')
      expect(valueEl).not.toHaveClass('mdk-metric-card__value--transparent')
    })

    it('uses the highlight modifier when isHighlighted=true', () => {
      expect(renderValue({ isHighlighted: true })).toHaveClass(
        'mdk-metric-card__value--highlighted',
      )
    })

    it('uses the transparent modifier when isTransparentColor=true and not highlighted', () => {
      expect(renderValue({ isTransparentColor: true })).toHaveClass(
        'mdk-metric-card__value--transparent',
      )
    })

    it('prefers the highlight modifier when both highlight and transparent are set', () => {
      const valueEl = renderValue({ isHighlighted: true, isTransparentColor: true })
      expect(valueEl).toHaveClass('mdk-metric-card__value--highlighted')
      expect(valueEl).not.toHaveClass('mdk-metric-card__value--transparent')
    })

    it('sets no inline colour on the value', () => {
      expect(renderValue({ isHighlighted: true }).getAttribute('style')).toBeNull()
    })
  })

  describe('display value', () => {
    it('renders a numeric value with the unit appended', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="TH/s" value={102.4} />)

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('102.4 TH/s')
    })

    it('renders a string value with the unit appended', () => {
      const { container } = render(<MetricCard label="Status" unit="state" value="online" />)

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('online state')
    })

    it('renders the raw value (no unit) when unit is empty string', () => {
      const { container } = render(<MetricCard label="Hashrate" unit="" value={102.4} />)

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('102.4')
    })

    it('renders zero with the unit appended by default', () => {
      const { container } = render(<MetricCard label="Revenue" unit="USD" value={0} />)

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('0 USD')
    })
  })

  describe('showDashForZero', () => {
    it('renders the fallback dash for value 0 when showDashForZero=true', () => {
      const { container } = render(
        <MetricCard label="Revenue" unit="USD" value={0} showDashForZero />,
      )

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe(FALLBACK)
    })

    it('does NOT append the unit when the dash fallback is shown', () => {
      const { container } = render(
        <MetricCard label="Revenue" unit="USD" value={0} showDashForZero />,
      )

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).not.toContain('USD')
    })

    it('still renders the numeric value when showDashForZero=true but value is non-zero', () => {
      const { container } = render(
        <MetricCard label="Revenue" unit="USD" value={42} showDashForZero />,
      )

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('42 USD')
    })

    it('renders 0 with unit when showDashForZero=false', () => {
      const { container } = render(
        <MetricCard label="Revenue" unit="USD" value={0} showDashForZero={false} />,
      )

      const valueEl = container.querySelector('.mdk-metric-card__value')
      expect(valueEl?.textContent).toBe('0 USD')
    })
  })

  describe('null values', () => {
    it('renders a null value alongside the unit (no dash fallback by default)', () => {
      const { container } = render(<MetricCard label="Temperature" unit="°C" value={null} />)

      const valueEl = container.querySelector('.mdk-metric-card__value')
      // React renders null as empty, so we just get the unit with the leading space
      expect(valueEl?.textContent).toBe(' °C')
    })
  })
})
