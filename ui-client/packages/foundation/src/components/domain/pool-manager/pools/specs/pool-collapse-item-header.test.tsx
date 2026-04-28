import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PoolSummary } from '../../types'
import { PoolCollapseItemHeader } from '../pool-collapse-item-header/pool-collapse-item-header'

vi.mock('../../pool-manager-constants', () => ({
  POOL_VALIDATION_STATUSES: { TESTED: 'TESTED' },
  POOL_VALIDATION_STATUS_LABELS: {
    TESTED: 'Tested',
    NOT_TESTED: 'Not Tested',
  },
}))

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    cn: (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' '),
  }
})

const makePool = (overrides: Partial<PoolSummary> = {}): PoolSummary => ({
  id: 'pool-1',
  name: 'Primary Pool',
  description: 'Main pool',
  units: 3,
  miners: 12,
  workerName: 'worker1',
  workerPassword: 'x',
  endpoints: [],
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

const renderHeader = (pool: PoolSummary) => render(<PoolCollapseItemHeader pool={pool} />)

describe('PoolCollapseItemHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('title section', () => {
    it('renders pool name', () => {
      renderHeader(makePool({ name: 'Ocean Pool' }))
      expect(screen.getByText('Ocean Pool')).toBeInTheDocument()
    })

    it('renders pool description', () => {
      renderHeader(makePool({ description: 'Low fee pool' }))
      expect(screen.getByText('Low fee pool')).toBeInTheDocument()
    })
  })

  describe('miner count section', () => {
    it('renders units count when units > 0', () => {
      renderHeader(makePool({ units: 4 }))
      expect(screen.getByText(/4 Units/)).toBeInTheDocument()
    })

    it('renders miners count when miners > 0', () => {
      renderHeader(makePool({ miners: 20 }))
      expect(screen.getByText(/20 Miners/)).toBeInTheDocument()
    })

    it('does not render units text when units is 0', () => {
      renderHeader(makePool({ units: 0, miners: 5 }))
      expect(screen.queryByText(/Units/)).not.toBeInTheDocument()
    })

    it('does not render miners text when miners is 0', () => {
      renderHeader(makePool({ units: 2, miners: 0 }))
      expect(screen.queryByText(/Miners/)).not.toBeInTheDocument()
    })
  })

  describe('validation badge', () => {
    it('does not render validation badge when validation is absent', () => {
      renderHeader(makePool({ validation: undefined }))
      expect(screen.queryByText('Tested')).not.toBeInTheDocument()
      expect(screen.queryByText('Not Tested')).not.toBeInTheDocument()
    })

    it('renders resolved label for TESTED status', () => {
      renderHeader(makePool({ validation: { status: 'TESTED' } }))
      expect(screen.getByText('Tested')).toBeInTheDocument()
    })

    it('renders resolved label for NOT_TESTED status', () => {
      renderHeader(makePool({ validation: { status: 'NOT_TESTED' } }))
      expect(screen.getByText('Not Tested')).toBeInTheDocument()
    })

    it('falls back to raw status when label is not found', () => {
      renderHeader(makePool({ validation: { status: 'UNKNOWN_STATUS' } }))
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument()
    })

    it('applies valid modifier class when status is TESTED', () => {
      renderHeader(makePool({ validation: { status: 'TESTED' } }))
      const badge = screen.getByText('Tested')
      expect(badge.className).toContain('mdk-pm-pool-header__validation--valid')
    })

    it('applies invalid modifier class when status is NOT_TESTED', () => {
      renderHeader(makePool({ validation: { status: 'NOT_TESTED' } }))
      const badge = screen.getByText('Not Tested')
      expect(badge.className).toContain('mdk-pm-pool-header__validation--invalid')
    })
  })
})
