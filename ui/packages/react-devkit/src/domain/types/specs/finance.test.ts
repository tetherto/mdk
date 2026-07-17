import { describe, expectTypeOf, it } from 'vitest'

import type {
  CostSummaryResponse,
  EbitdaResponse,
  EnergyBalanceResponse,
  FinancePeriod,
  FinanceQueryParams,
  FinanceResponse,
  FinanceRevenueQueryParams,
  FinanceRevenueResponse,
  HashRevenueResponse,
  RevenueSummaryResponse,
  SubsidyFeesResponse,
} from '../finance'

describe('finance types', () => {
  it('FinancePeriod is the union of finance bucket sizes', () => {
    expectTypeOf<FinancePeriod>().toEqualTypeOf<'daily' | 'weekly' | 'monthly' | 'yearly'>()
  })

  it('FinanceQueryParams shape', () => {
    const params: FinanceQueryParams = { start: 0, end: 1 }
    expectTypeOf(params.start).toBeNumber()
    expectTypeOf(params.end).toBeNumber()
    expectTypeOf(params.period).toEqualTypeOf<FinancePeriod | undefined>()
    expectTypeOf(params.overwriteCache).toEqualTypeOf<boolean | undefined>()
  })

  it('FinanceRevenueQueryParams extends FinanceQueryParams with pool', () => {
    const params: FinanceRevenueQueryParams = { start: 0, end: 1, pool: 'p1' }
    expectTypeOf(params.pool).toEqualTypeOf<string | undefined>()
    expectTypeOf<FinanceRevenueQueryParams>().toMatchTypeOf<FinanceQueryParams>()
  })

  it('FinanceResponse splits log entries from summary totals', () => {
    type Entry = { ts: number; value: number }
    type Totals = { total: number }
    expectTypeOf<FinanceResponse<Entry, Totals>>().toEqualTypeOf<{
      log: Entry[]
      summary: Totals
    }>()
  })

  it('Each *Response uses FinanceResponse with its log + totals', () => {
    expectTypeOf<RevenueSummaryResponse['log'][number]['ts']>().toBeNumber()
    expectTypeOf<RevenueSummaryResponse['summary']['currentBtcPrice']>().toBeNumber()
    expectTypeOf<RevenueSummaryResponse['summary']['avgCostPerMWh']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<EbitdaResponse['summary']['totalEbitdaSelling']>().toBeNumber()
    expectTypeOf<EbitdaResponse['summary']['avgBtcProductionCost']>().toEqualTypeOf<number | null>()

    expectTypeOf<EnergyBalanceResponse['log'][number]['profitUSD']>().toBeNumber()
    expectTypeOf<EnergyBalanceResponse['summary']['avgPowerUtilization']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<CostSummaryResponse['log'][number]['energyCostsUSD']>().toBeNumber()
    expectTypeOf<CostSummaryResponse['summary']['avgEnergyCostPerMWh']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<SubsidyFeesResponse['log'][number]['blockReward']>().toBeNumber()
    expectTypeOf<SubsidyFeesResponse['summary']['avgBlockTotalFees']>().toEqualTypeOf<
      number | null
    >()

    expectTypeOf<FinanceRevenueResponse['summary']['totalNetRevenueBTC']>().toBeNumber()

    expectTypeOf<HashRevenueResponse['log'][number]['networkHashrateMhs']>().toBeNumber()
    expectTypeOf<HashRevenueResponse['summary']['avgHashRevenueBTCPerPHsPerDay']>().toEqualTypeOf<
      number | null
    >()
  })
})
