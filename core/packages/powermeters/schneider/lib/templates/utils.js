'use strict'

const isTransformerPM = (entry) => {
  const regex = /^tr\d+$/
  return regex.test(entry?.info?.pos)
}

module.exports = {
  isTransformerPM
}
