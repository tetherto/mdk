'use strict'

const crypto = require('crypto')
const { getRandomIP } = require('./utils')

const minerTypeMap = {
  S19xp: 'Antminer S19 XP',
  S19xp_h: 'Antminer S19 XP Hyd.',
  S21: 'Antminer S21',
  S21pro: 'Antminer S21pro'
}

const md5 = input => {
  const hash = crypto.createHash('MD5')
  hash.update(input)

  return hash.digest('hex')
}

function randomFloat () {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

function randomNumber (min = 0, max = 1) {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

function getRandomHashrate () {
  return randomNumber(290000000, 300000000)
}

function getHashrate () {
  const hashrate = {
    rate_5s: getRandomHashrate(),
    rate_30m: getRandomHashrate()
  }

  hashrate.rate_avg = Object.values(hashrate).reduce((acc, val) => acc + val, 0) / 2

  return hashrate
}

module.exports = {
  getMinerType: (type) => {
    return minerTypeMap[type]
  },
  md5,
  randomNumber,
  getHashrate,
  getRandomIP
}
