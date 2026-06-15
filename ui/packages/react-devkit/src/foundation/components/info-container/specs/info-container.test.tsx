import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeviceInfo, InfoContainer } from '../info-container'

describe('InfoContainer', () => {
  describe('rendering', () => {
    it('renders the wrapper with correct class', () => {
      const { container } = render(<InfoContainer />)

      expect(container.querySelector('.mdk-info-container')).toBeInTheDocument()
    })

    it('renders title with correct class', () => {
      render(<InfoContainer title="Model" />)

      expect(document.querySelector('.mdk-info-container__title')).toBeInTheDocument()
    })

    it('renders value wrapper with correct class', () => {
      const { container } = render(<InfoContainer value="S19" />)

      expect(container.querySelector('.mdk-info-container__value')).toBeInTheDocument()
    })
  })

  describe('title', () => {
    it('displays the title text', () => {
      render(<InfoContainer title="Model" />)

      expect(screen.getByText('Model')).toBeInTheDocument()
    })

    it('renders empty title when not provided', () => {
      render(<InfoContainer value="S19" />)

      const title = document.querySelector('.mdk-info-container__title')
      expect(title?.textContent).toBe('')
    })
  })

  describe('value — string', () => {
    it('displays a string value', () => {
      render(<InfoContainer title="Model" value="S19" />)

      expect(screen.getByText('S19')).toBeInTheDocument()
    })

    it('renders a single div for a string value', () => {
      const { container } = render(<InfoContainer value="S19" />)

      const valueWrapper = container.querySelector('.mdk-info-container__value')
      expect(valueWrapper?.querySelectorAll('div')).toHaveLength(1)
    })
  })

  describe('value — number', () => {
    it('displays a numeric value', () => {
      render(<InfoContainer title="Count" value={42} />)

      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders a single div for a number value', () => {
      const { container } = render(<InfoContainer value={42} />)

      const valueWrapper = container.querySelector('.mdk-info-container__value')
      expect(valueWrapper?.querySelectorAll('div')).toHaveLength(1)
    })
  })

  describe('value — string array', () => {
    it('renders one div per array item', () => {
      const { container } = render(<InfoContainer value={['a', 'b', 'c']} />)

      const valueWrapper = container.querySelector('.mdk-info-container__value')
      expect(valueWrapper?.querySelectorAll('div')).toHaveLength(3)
    })

    it('displays each array item', () => {
      render(<InfoContainer value={['foo', 'bar', 'baz']} />)

      expect(screen.getByText('foo')).toBeInTheDocument()
      expect(screen.getByText('bar')).toBeInTheDocument()
      expect(screen.getByText('baz')).toBeInTheDocument()
    })
  })

  describe('value — undefined', () => {
    it('renders one empty div when value is undefined', () => {
      const { container } = render(<InfoContainer />)

      const valueWrapper = container.querySelector('.mdk-info-container__value')
      expect(valueWrapper?.querySelectorAll('div')).toHaveLength(1)
    })
  })
})

// ---------------------------------------------------------------------------
// DeviceInfo
// ---------------------------------------------------------------------------

describe('DeviceInfo', () => {
  describe('rendering', () => {
    it('renders the wrapper with correct class', () => {
      const { container } = render(<DeviceInfo />)

      expect(container.querySelector('.mdk-device-info')).toBeInTheDocument()
    })

    it('renders nothing inside wrapper when data is undefined', () => {
      const { container } = render(<DeviceInfo />)

      const wrapper = container.querySelector('.mdk-device-info')
      expect(wrapper?.children).toHaveLength(0)
    })

    it('renders nothing inside wrapper when data is empty array', () => {
      const { container } = render(<DeviceInfo data={[]} />)

      const wrapper = container.querySelector('.mdk-device-info')
      expect(wrapper?.children).toHaveLength(0)
    })

    it('renders one InfoContainer per data item', () => {
      const data = [{ title: 'A', value: '1' }, { title: 'B', value: '2' }, { title: 'C' }]
      const { container } = render(<DeviceInfo data={data} />)

      expect(container.querySelectorAll('.mdk-info-container')).toHaveLength(3)
    })
  })

  describe('value normalisation', () => {
    it('converts a number value to string', () => {
      render(<DeviceInfo data={[{ title: 'Count', value: 99 }]} />)

      expect(screen.getByText('99')).toBeInTheDocument()
    })

    it('converts an array of values to strings', () => {
      render(<DeviceInfo data={[{ title: 'Tags', value: ['x', 'y'] }]} />)

      expect(screen.getByText('x')).toBeInTheDocument()
      expect(screen.getByText('y')).toBeInTheDocument()
    })

    it('passes a string value through unchanged', () => {
      render(<DeviceInfo data={[{ title: 'Model', value: 'S19' }]} />)

      expect(screen.getByText('S19')).toBeInTheDocument()
    })

    it('handles undefined value gracefully', () => {
      const { container } = render(<DeviceInfo data={[{ title: 'Empty' }]} />)

      expect(container.querySelector('.mdk-info-container')).toBeInTheDocument()
    })
  })

  describe('title normalisation', () => {
    it('renders title as string', () => {
      render(<DeviceInfo data={[{ title: 'Firmware' }]} />)

      expect(screen.getByText('Firmware')).toBeInTheDocument()
    })

    it('passes undefined title through as undefined', () => {
      render(<DeviceInfo data={[{ value: 'val' }]} />)

      const title = document.querySelector('.mdk-info-container__title')
      expect(title?.textContent).toBe('')
    })
  })

  describe('extra keys on data items', () => {
    it('ignores unknown keys and still renders correctly', () => {
      const data = [{ title: 'IP', value: '192.168.1.1', extra: true, foo: 123 }]
      render(<DeviceInfo data={data} />)

      expect(screen.getByText('IP')).toBeInTheDocument()
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
    })
  })
})
