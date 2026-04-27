'use strict'

function strToAsciiBuffer (s) {
  const charCodeArr = []

  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    charCodeArr.push(code)
  }

  return Buffer.from(charCodeArr)
}

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min = 0, max = 1) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

function getRandomPower () {
  return randomNumber() * 7000000 - 6700000
}

function getActivePower () {
  const activePower = {
    active_power_l1_w: getRandomPower(),
    active_power_l2_w: getRandomPower(),
    active_power_l3_w: getRandomPower()
  }

  activePower.active_power_total_w = Object.values(activePower).reduce((acc, val) => acc + val, 0)

  return activePower
}

function cleanup (state, initialState) {
  Object.assign(state, initialState)
  return state
}

module.exports = {
  strToAsciiBuffer,
  getRandomPower,
  getActivePower,
  cleanup,
  randomNumber
}
