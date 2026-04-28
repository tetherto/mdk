import { describe, expect, it, vi } from 'vitest'

import {
  alertsNeeded,
  MAX_ALERTS_DISPLAYED,
  navigationBlocks,
  POOL_MANAGER_ROUTES,
} from '../dashboard-constants'

vi.mock('@tetherto/core', () => ({
  PoolsIcon: () => <div data-testid="PoolsIcon" />,
  SiteOverviewIcon: () => <div data-testid="SiteOverviewIcon" />,
  MinerOverviewIcon: () => <div data-testid="MinerOverviewIcon" />,
}))

describe('dashboard-constants', () => {
  // ── MAX_ALERTS_DISPLAYED ───────────────────────────────────────────────────

  describe('MAX_ALERTS_DISPLAYED', () => {
    it('is 5', () => {
      expect(MAX_ALERTS_DISPLAYED).toBe(5)
    })

    it('is a number', () => {
      expect(typeof MAX_ALERTS_DISPLAYED).toBe('number')
    })
  })

  // ── POOL_MANAGER_ROUTES ───────────────────────────────────────────────────

  describe('POOL_MANAGER_ROUTES', () => {
    it('has POOL_ENDPOINTS route', () => {
      expect(POOL_MANAGER_ROUTES.POOL_ENDPOINTS).toBe('/pool-manager/pools')
    })

    it('has SITES_OVERVIEW route', () => {
      expect(POOL_MANAGER_ROUTES.SITES_OVERVIEW).toBe('/pool-manager/sites-overview')
    })

    it('has MINER_EXPLORER route', () => {
      expect(POOL_MANAGER_ROUTES.MINER_EXPLORER).toBe('/pool-manager/miner-explorer')
    })

    it('has exactly 3 routes', () => {
      expect(Object.keys(POOL_MANAGER_ROUTES)).toHaveLength(3)
    })

    it('all routes start with /pool-manager/', () => {
      Object.values(POOL_MANAGER_ROUTES).forEach((route) => {
        expect(route).toMatch(/^\/pool-manager\//)
      })
    })
  })

  // ── navigationBlocks ──────────────────────────────────────────────────────

  describe('navigationBlocks', () => {
    it('has exactly 3 blocks', () => {
      expect(navigationBlocks).toHaveLength(3)
    })

    it('every block has an icon', () => {
      navigationBlocks.forEach((block) => {
        expect(block.icon).toBeDefined()
        expect(block.icon).not.toBeNull()
      })
    })

    it('every block has a non-empty title', () => {
      navigationBlocks.forEach((block) => {
        expect(typeof block.title).toBe('string')
        expect(block.title.length).toBeGreaterThan(0)
      })
    })

    it('every block has a non-empty description', () => {
      navigationBlocks.forEach((block) => {
        expect(typeof block.description).toBe('string')
        expect(block.description.length).toBeGreaterThan(0)
      })
    })

    it('every block has a non-empty navText', () => {
      navigationBlocks.forEach((block) => {
        expect(typeof block.navText).toBe('string')
        expect(block.navText.length).toBeGreaterThan(0)
      })
    })

    it('every block url starts with /', () => {
      navigationBlocks.forEach((block) => {
        expect(block.url).toMatch(/^\//)
      })
    })

    it('Pools block has correct values', () => {
      const block = navigationBlocks[0]!
      expect(block.title).toBe('Pools')
      expect(block.navText).toBe('Configure Pools')
      expect(block.url).toBe(POOL_MANAGER_ROUTES.POOL_ENDPOINTS)
    })

    it('Site Overview block has correct values', () => {
      const block = navigationBlocks[1]!
      expect(block.title).toBe('Site Overview')
      expect(block.navText).toBe('View Layout')
      expect(block.url).toBe(POOL_MANAGER_ROUTES.SITES_OVERVIEW)
    })

    it('Miner Explorer block has correct values', () => {
      const block = navigationBlocks[2]!
      expect(block.title).toBe('Miner Explorer')
      expect(block.navText).toBe('Explore Miners')
      expect(block.url).toBe(POOL_MANAGER_ROUTES.MINER_EXPLORER)
    })

    it('all block urls are unique', () => {
      const urls = navigationBlocks.map((b) => b.url)
      const unique = new Set(urls)
      expect(unique.size).toBe(urls.length)
    })

    it('all block titles are unique', () => {
      const titles = navigationBlocks.map((b) => b.title)
      const unique = new Set(titles)
      expect(unique.size).toBe(titles.length)
    })

    it('block urls match POOL_MANAGER_ROUTES values', () => {
      const routeValues = Object.values(POOL_MANAGER_ROUTES)
      navigationBlocks.forEach((block) => {
        expect(routeValues).toContain(block.url)
      })
    })
  })

  // ── alertsNeeded ──────────────────────────────────────────────────────────

  describe('alertsNeeded', () => {
    it('is a Set', () => {
      expect(alertsNeeded).toBeInstanceOf(Set)
    })

    it('has 6 entries', () => {
      expect(alertsNeeded.size).toBe(6)
    })

    it('contains pool_connect_failed', () => {
      expect(alertsNeeded.has('pool_connect_failed')).toBe(true)
    })

    it('contains all_pools_dead', () => {
      expect(alertsNeeded.has('all_pools_dead')).toBe(true)
    })

    it('contains wrong_miner_pool', () => {
      expect(alertsNeeded.has('wrong_miner_pool')).toBe(true)
    })

    it('contains wrong_miner_subaccount', () => {
      expect(alertsNeeded.has('wrong_miner_subaccount')).toBe(true)
    })

    it('contains wrong_worker_name', () => {
      expect(alertsNeeded.has('wrong_worker_name')).toBe(true)
    })

    it('contains ip_worker_name', () => {
      expect(alertsNeeded.has('ip_worker_name')).toBe(true)
    })

    it('does not contain unknown alert codes', () => {
      expect(alertsNeeded.has('unknown_alert')).toBe(false)
      expect(alertsNeeded.has('')).toBe(false)
    })
  })
})
