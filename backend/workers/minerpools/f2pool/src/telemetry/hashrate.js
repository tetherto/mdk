'use strict'

const pool = require('../pool')

module.exports = async (params) => {
  const { stats } = await pool.stats(params)
  return stats.reduce((sum, s) => sum + (s.hashrate || 0), 0)
}
