'use strict'

const MINOR_ERROR_CODES_M56S_M30_SET = new Set(
  [203, 204, 205, 206, 217, 219, 236, 248, 270, 275, 320, 321, 322, 620, 714, 901, 2320, 2330, 2350, 5140, 5141]
)

const MINOR_ERROR_CODES_M53_SET = new Set(
  [202, 205, 217, 264, 265, 266, 267, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280]
)

const DEFAULT_NOMINAL_EFFICIENCY_WTHS = {
  'miner-wm-m30sp': 33,
  'miner-wm-m30spp': 33,
  'miner-wm-m53s': 26,
  'miner-wm-m56s': 26,
  'miner-wm-m63': 26
}

const MINER_COOLING_TYPE_MAP = {
  HYDRO: ['m63', 'm53s'],
  IMMERSION: ['m56s'],
  AIR: ['m30sp', 'm30spp']
}

module.exports = {
  MINOR_ERROR_CODES_M56S_M30_SET,
  MINOR_ERROR_CODES_M53_SET,
  DEFAULT_NOMINAL_EFFICIENCY_WTHS,
  MINER_COOLING_TYPE_MAP
}
