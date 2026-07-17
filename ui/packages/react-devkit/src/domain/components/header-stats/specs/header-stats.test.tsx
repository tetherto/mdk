import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeaderConsumptionBox } from '../header-consumption-box'
import { HeaderEfficiencyBox } from '../header-efficiency-box'
import { HeaderHashrateBox } from '../header-hashrate-box'
import { HeaderMinersBox } from '../header-miners-box'

describe('HeaderConsumptionBox', () => {
  it('formats a numeric value with three fraction digits and renders the default unit', () => {
    render(<HeaderConsumptionBox valueMw={1.663} />)
    expect(screen.getByText('1.663')).toBeInTheDocument()
    expect(screen.getByText('MW')).toBeInTheDocument()
  })

  it('falls back to em-dash when valueMw is undefined', () => {
    render(<HeaderConsumptionBox />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders a custom icon and unit override', () => {
    render(
      <HeaderConsumptionBox icon={<span data-testid="custom-icon" />} unit="kW" valueMw={42} />,
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    expect(screen.getByText('kW')).toBeInTheDocument()
  })
})

describe('HeaderEfficiencyBox', () => {
  it('formats a numeric value with two fraction digits and renders the default unit', () => {
    render(<HeaderEfficiencyBox valueWthS={28.42} />)
    expect(screen.getByText('28.42')).toBeInTheDocument()
    expect(screen.getByText('W/TH/S')).toBeInTheDocument()
  })

  it('falls back to em-dash when valueWthS is undefined', () => {
    render(<HeaderEfficiencyBox />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('accepts a custom icon override', () => {
    render(<HeaderEfficiencyBox icon={<span data-testid="eff-icon" />} valueWthS={30} />)
    expect(screen.getByTestId('eff-icon')).toBeInTheDocument()
  })
})

describe('HeaderHashrateBox', () => {
  it('renders both MOS and Pool rows with formatted values', () => {
    render(<HeaderHashrateBox mosPhs={12.345} poolPhs={11.111} />)
    expect(screen.getByText('12.345')).toBeInTheDocument()
    expect(screen.getByText('11.111')).toBeInTheDocument()
    expect(screen.getByText('MOS')).toBeInTheDocument()
    expect(screen.getByText('Pool')).toBeInTheDocument()
    expect(screen.getAllByText('PH/s')).toHaveLength(2)
  })

  it('renders em-dashes when both values are undefined', () => {
    render(<HeaderHashrateBox />)
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('accepts a custom icon and unit override', () => {
    render(
      <HeaderHashrateBox
        icon={<span data-testid="hr-icon" />}
        unit="TH/s"
        mosPhs={1}
        poolPhs={2}
      />,
    )
    expect(screen.getByTestId('hr-icon')).toBeInTheDocument()
    expect(screen.getAllByText('TH/s')).toHaveLength(2)
  })
})

describe('HeaderMinersBox', () => {
  it('renders all numeric fields when provided', () => {
    render(
      <HeaderMinersBox
        mosTotal={2188}
        total={2188}
        online={158}
        error={12}
        offline={3}
        poolTotal={2200}
        poolOnline={2150}
        poolMismatch={4}
      />,
    )
    expect(screen.getByText('MOS (2,188)')).toBeInTheDocument()
    expect(screen.getByText('Pool (2,200)')).toBeInTheDocument()
    expect(screen.getAllByText('158')).toHaveLength(2)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2,150')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('falls back to em-dashes when every count is undefined', () => {
    const { container } = render(<HeaderMinersBox />)
    expect(container.querySelectorAll('.mdk-header-stat-box__success').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6)
    expect(screen.getByText('MOS (—)')).toBeInTheDocument()
    expect(screen.getByText('Pool (—)')).toBeInTheDocument()
  })

  it('uses the default miners icon when none is provided', () => {
    const { container } = render(<HeaderMinersBox />)
    expect(container.querySelector('.mdk-header-stat-box__icon')?.children.length).toBe(1)
  })

  it('accepts a custom icon override', () => {
    render(<HeaderMinersBox icon={<span data-testid="miners-icon" />} />)
    expect(screen.getByTestId('miners-icon')).toBeInTheDocument()
  })
})
