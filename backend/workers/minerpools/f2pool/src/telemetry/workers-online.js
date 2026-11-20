'use strict'

const pool = require('../pool')

module.exports = async (params) => {
  const { workers } = await pool.workers(params)
  return workers.length
}
