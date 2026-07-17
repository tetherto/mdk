'use strict'

const {
  ENDPOINTS,
  HTTP_METHODS
} = require('../../constants')
const {
  getEnergyBalance,
  getEbitda,
  getCostSummary,
  getSubsidyFees,
  getRevenue,
  getRevenueSummary,
  getHashRevenue
} = require('../handlers/finance.handlers')
const { createCachedAuthRoute } = require('../lib/routeHelpers')

module.exports = (ctx) => {
  const schemas = require('../schemas/finance.schemas.js')

  return [
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_ENERGY_BALANCE,
      schema: {
        querystring: schemas.query.energyBalance
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/energy-balance',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_ENERGY_BALANCE,
        getEnergyBalance
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_EBITDA,
      schema: {
        querystring: schemas.query.ebitda
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/ebitda',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_EBITDA,
        getEbitda
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_COST_SUMMARY,
      schema: {
        querystring: schemas.query.costSummary
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/cost-summary',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_COST_SUMMARY,
        getCostSummary
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_SUBSIDY_FEES,
      schema: {
        querystring: schemas.query.subsidyFees
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/subsidy-fees',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_SUBSIDY_FEES,
        getSubsidyFees
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_REVENUE,
      schema: {
        querystring: schemas.query.revenue
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/revenue',
          req.query.start,
          req.query.end,
          req.query.period,
          req.query.pool
        ],
        ENDPOINTS.FINANCE_REVENUE,
        getRevenue
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_REVENUE_SUMMARY,
      schema: {
        querystring: schemas.query.revenueSummary
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/revenue-summary',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_REVENUE_SUMMARY,
        getRevenueSummary
      )
    },
    {
      method: HTTP_METHODS.GET,
      url: ENDPOINTS.FINANCE_HASH_REVENUE,
      schema: {
        querystring: schemas.query.hashRevenue
      },
      ...createCachedAuthRoute(
        ctx,
        (req) => [
          'finance/hash-revenue',
          req.query.start,
          req.query.end,
          req.query.period
        ],
        ENDPOINTS.FINANCE_HASH_REVENUE,
        getHashRevenue
      )
    }
  ]
}
