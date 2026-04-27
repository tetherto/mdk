'use strict'

const VALID_TACTICS_TYPES = ['0', '1', '2']

const validateTacticsType = (tacticsType) => {
  if (!VALID_TACTICS_TYPES.includes(tacticsType)) {
    throw new Error('ERR_INVALID_TACTICS_TYPE')
  }
}

const isValidPrice = (price) => {
  return price !== null && price !== undefined && parseFloat(price) >= 0
}

const validateElectricityPrice = (electricityPrice, priceField) => {
  if (!isValidPrice(electricityPrice?.[priceField])) {
    throw new Error('ERR_INVALID_ELECTRICITY_PRICE')
  }
  if (!isValidPrice(electricityPrice?.CurrentPrice)) {
    throw new Error('ERR_INVALID_ELECTRICITY_PRICE')
  }
}

const validateCoinPrice = (coinPrice, priceField) => {
  if (!isValidPrice(coinPrice?.[priceField])) {
    throw new Error('ERR_INVALID_COIN_PRICE')
  }
  if (!isValidPrice(coinPrice?.CurrentPrice)) {
    throw new Error('ERR_INVALID_COIN_PRICE')
  }
}

const validateStopTactics = (stopTactics) => {
  if (!stopTactics) {
    throw new Error('ERR_INVALID_TACTICS')
  }

  validateTacticsType(stopTactics.TacticsType)
  validateElectricityPrice(stopTactics.ElectricityPrice, 'StopPrice')
  validateCoinPrice(stopTactics.CoinPrice, 'StopPrice')
}

const validateRunTactics = (runTactics) => {
  if (!runTactics) {
    throw new Error('ERR_INVALID_TACTICS')
  }

  validateTacticsType(runTactics.TacticsType)
  validateElectricityPrice(runTactics.ElectricityPrice, 'RunPrice')
  validateCoinPrice(runTactics.CoinPrice, 'RunPrice')
}

const validateTactics = (tactics) => {
  if (!tactics) {
    throw new Error('ERR_INVALID_TACTICS')
  }

  validateStopTactics(tactics.StopTactics)
  validateRunTactics(tactics.RunTactics)
}

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    const newTactics = cmd.Tactics

    validateTactics(newTactics)

    state.Tactics = newTactics
  } catch (e) {
  }
  cb()
}
