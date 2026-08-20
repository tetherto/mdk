'use strict'

const net = require('node:net')

function normalizeNetworkConfig (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ERR_NETWORK_CONFIG_INVALID')
  }

  if (value.dhcp === true) return { dhcp: true }
  if (value.dhcp !== false) throw new Error('ERR_NETWORK_CONFIG_INVALID')

  const addresses = value.network && typeof value.network === 'object'
    ? value.network
    : value
  const ip = addresses.ip
  const netmask = addresses.netmask || addresses.mask
  const gateway = addresses.gateway
  const dnsValues = Array.isArray(value.dns)
    ? value.dns
    : typeof value.dns === 'string'
      ? value.dns.split(/\s+/).filter(Boolean)
      : []

  if (![ip, netmask, gateway, ...dnsValues].every(address => net.isIP(address) === 4) || dnsValues.length === 0) {
    throw new Error('ERR_NETWORK_ADDRESS_INVALID')
  }

  return {
    dhcp: false,
    ip,
    netmask,
    gateway,
    dns: dnsValues.join(' ')
  }
}

module.exports = normalizeNetworkConfig
