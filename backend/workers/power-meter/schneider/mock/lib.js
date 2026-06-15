'use strict'

const crypto = require('crypto')

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min = 0, max = 1) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

function getRandomPower () {
  return randomNumber() * 3000 + 2000
}

module.exports = {
  getRandomPower
}
