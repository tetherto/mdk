'use strict'

const net = require('net')

// Custom IP validation that accepts leading zeros in octets
const isValidIp = (ip) => {
  // First try standard validation
  if (net.isIP(ip) !== 0) return true

  // Then check if it matches the pattern for IPs with leading zeros
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(ipPattern)
  if (!match) return false

  // Check if each octet, when parsed as integer, is between 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10)
    if (isNaN(octet) || octet < 0 || octet > 255) return false
  }

  return true
}

const getMinerStaticIpFromThgInfo = (thg) => {
  const containerNumber = thg.info.container.split('-').pop()
  const [cupboard, shelf, pos] = thg.info.pos.split('_')
  const ip = `10.${containerNumber}.${cupboard}.${shelf}${pos}`
  return isValidIp(ip) ? ip : ''
}

module.exports = {
  getMinerStaticIpFromThgInfo
}
