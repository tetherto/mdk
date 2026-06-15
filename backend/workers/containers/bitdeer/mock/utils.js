'use strict'

const crypto = require('crypto')

const dateFormat0 = (d) => {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

const randomFloat = () => {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

const randomNumber = (min, max) => {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

const getRandomPower = () => {
  return randomNumber(2000, 3000)
}

module.exports = {
  dateFormat0,
  getRandomPower
}
