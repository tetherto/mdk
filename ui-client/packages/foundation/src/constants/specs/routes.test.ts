import { describe, expect, it } from 'vitest'
import { ROUTE, ROUTE_TITLES_MAP } from '../routes'

describe('routes constants', () => {
  describe('routes', () => {
    it('should have core routes', () => {
      expect(ROUTE.HOME).toBe('/')
      expect(ROUTE.ALERTS).toBe('/alerts')
      expect(ROUTE.SIGN_IN).toBe('/signin')
      expect(ROUTE.SIGN_OUT).toBe('/signout')
      expect(ROUTE.DASHBOARD).toBe('/dashboard')
    })

    it('should have pool manager routes', () => {
      expect(ROUTE.POOL_MANAGER).toBe('/pool-manager')
      expect(ROUTE.POOL_MANAGER_SITES).toBe('/pool-manager/sites')
      expect(ROUTE.POOL_MANAGER_DASHBOARD).toBe('/pool-manager/dashboard')
      expect(ROUTE.POOL_MANAGER_POOL_ENDPOINTS).toBe('/pool-manager/pool-endpoints')
    })

    it('should have operations routes', () => {
      expect(ROUTE.OPERATIONS).toBe('/operations')
      expect(ROUTE.OPERATIONS_ENERGY).toBe('/operations/energy')
      expect(ROUTE.OPERATIONS_MINING).toBe('/operations/mining')
      expect(ROUTE.OPERATIONS_MINING_EXPLORER).toBe('/operations/mining/explorer')
    })

    it('should have reports routes', () => {
      expect(ROUTE.REPORTS).toBe('/reports')
      expect(ROUTE.REPORTS_FINANCIAL).toBe('/reports/financial')
      expect(ROUTE.REPORTS_OPERATIONS).toBe('/reports/operations')
      expect(ROUTE.REPORTS_FINANCIAL_EBITDA).toBe('/reports/financial/ebitda')
    })

    it('should have inventory routes', () => {
      expect(ROUTE.INVENTORY).toBe('/inventory')
      expect(ROUTE.INVENTORY_MINERS).toBe('/inventory/miners')
      expect(ROUTE.INVENTORY_REPAIRS).toBe('/inventory/repairs')
      expect(ROUTE.INVENTORY_MOVEMENTS).toBe('/inventory/movements')
      expect(ROUTE.INVENTORY_SPARE_PARTS).toBe('/inventory/spare-parts')
    })

    it('should have settings routes', () => {
      expect(ROUTE.SETTINGS).toBe('/settings')
      expect(ROUTE.SETTINGS_USERS).toBe('/settings/users')
      expect(ROUTE.SETTINGS_DASHBOARD).toBe('/settings/dashboard')
    })

    it('should have multi-site routes', () => {
      expect(ROUTE.MULTI_SITE_DASHBOARD).toBe('/dashboard')
      expect(ROUTE.MULTI_SITE_REPORTS).toBe('/site-reports')
      expect(ROUTE.MULTI_SITE_OPERATIONS).toBe('/site-operations')
      expect(ROUTE.MULTI_SITE_REVENUE_AND_COST).toBe('/revenue-and-cost/revenue')
    })

    it('should have routes starting with slash', () => {
      Object.values(ROUTE).forEach((route) => {
        expect(route).toMatch(/^\//)
      })
    })
  })

  describe('route titles map', () => {
    it('should map routes to titles', () => {
      expect(ROUTE_TITLES_MAP[ROUTE.ALERTS]).toBe('Alerts')
      expect(ROUTE_TITLES_MAP[ROUTE.DASHBOARD]).toBe('Dashboard')
      expect(ROUTE_TITLES_MAP[ROUTE.SIGN_IN]).toBe('Sign In')
      expect(ROUTE_TITLES_MAP[ROUTE.SETTINGS]).toBe('Settings')
    })

    it('should have titles as non-empty strings', () => {
      Object.values(ROUTE_TITLES_MAP).forEach((title) => {
        expect(typeof title).toBe('string')
        expect(title.length).toBeGreaterThan(0)
      })
    })

    it('should have titles for major routes', () => {
      expect(ROUTE_TITLES_MAP[ROUTE.INVENTORY_MINERS]).toBeDefined()
      expect(ROUTE_TITLES_MAP[ROUTE.OPERATIONS_MINING_EXPLORER]).toBeDefined()
      expect(ROUTE_TITLES_MAP[ROUTE.REPORTS_FINANCIAL_EBITDA]).toBeDefined()
    })
  })
})
