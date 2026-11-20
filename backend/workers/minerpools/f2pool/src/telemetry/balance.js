'use strict'

const pool = require('../pool')

module.exports = async (params) => {
  const { stats } = await pool.stats(params)
  return stats.reduce((sum, s) => sum + (s.balance || 0), 0)
}
