'use strict'

const crypto = require('crypto')

const getRandomPowerReading = () => {
  return Math.floor(randomNumber() * (6000 - 3000 + 1)) + 3000
}

const randomFloat = () => {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

const randomNumber = (min, max) => {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

const getRandomIP = () => [...crypto.randomBytes(4)].join('.')

module.exports = {
  getRandomPowerReading,
  randomNumber,
  getRandomIP
}
