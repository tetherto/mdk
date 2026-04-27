import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StaticMinerIpAssigment } from '../static-miner-ip-assigment/static-miner-ip-assigment'

describe('StaticMinerIpAssigment with Custom Input', () => {
  const mockSetIp = vi.fn()

  it('renders with the correct label and value', () => {
    render(
      <StaticMinerIpAssigment
        setMinerIp={mockSetIp}
        isStaticIpAssignment={true}
        minerIp="10.50.1.1"
        forceSetIp={true}
        isChangeInfo={false}
      />,
    )

    expect(screen.getByLabelText('Changed Miner IP Address')).toBeDefined()
    expect(screen.getByDisplayValue('10.50.1.1')).toBeDefined()
  })

  it('correctly disables the input when forceSetIp is false', () => {
    render(
      <StaticMinerIpAssigment
        setMinerIp={mockSetIp}
        isStaticIpAssignment={true}
        minerIp="10.50.1.1"
        forceSetIp={false}
        isChangeInfo={false}
      />,
    )

    const input = screen.getByLabelText('Changed Miner IP Address')
    expect(input).toBeDisabled()
  })
})
