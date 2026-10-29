'use strict'

const test = require('brittle')
const { parseBootstrap, parseDhtHost, resolveDhtHost, dhtFromEnv } = require('../../lib/dht-bootstrap')

test('parseBootstrap - arrays, objects and the comma-separated env form', (t) => {
  t.is(parseBootstrap(undefined), null)
  t.is(parseBootstrap(''), null)
  t.is(parseBootstrap([]), null)
  t.alike(parseBootstrap('127.0.0.1:49737, 10.0.0.5:49738'), ['127.0.0.1:49737', '10.0.0.5:49738'])
  t.alike(parseBootstrap([{ host: '10.0.0.5', port: 49737 }, 'dht.site.lan:49737']), ['10.0.0.5:49737', 'dht.site.lan:49737'])
})

test('parseBootstrap - malformed entries and public hyperdht nodes are refused', (t) => {
  t.exception(() => parseBootstrap('127.0.0.1'), /ERR_MDK_DHT_BOOTSTRAP_INVALID/)
  t.exception(() => parseBootstrap(':49737'), /ERR_MDK_DHT_BOOTSTRAP_INVALID/)
  t.exception(() => parseBootstrap('10.0.0.5:99999'), /ERR_MDK_DHT_BOOTSTRAP_INVALID/)
  t.exception(() => parseBootstrap('node2.hyperdht.org:49737'), /ERR_MDK_DHT_BOOTSTRAP_PUBLIC/)
  t.exception(() => parseBootstrap(['10.0.0.5:49737', '88.99.3.86@node1.hyperdht.org:49737']), /ERR_MDK_DHT_BOOTSTRAP_PUBLIC/)
  t.exception(() => parseBootstrap('138.68.147.8:49737'), /ERR_MDK_DHT_BOOTSTRAP_PUBLIC/)
})

test('parseDhtHost - IP literals only', (t) => {
  t.is(parseDhtHost(undefined), null)
  t.is(parseDhtHost('127.0.0.1'), '127.0.0.1')
  t.is(parseDhtHost('::1'), '::1')
  t.exception(() => parseDhtHost('localhost'), /ERR_MDK_DHT_HOST_INVALID/)
})

test('resolveDhtHost - loopback only for a generated bootstrap, never loopback toward a LAN list', (t) => {
  t.is(resolveDhtHost(null, null), '127.0.0.1', 'generated bootstrap: loopback')
  t.is(resolveDhtHost('10.0.0.7', null), '10.0.0.7')
  t.is(resolveDhtHost(null, ['10.0.0.5:49737']), null, 'joining a LAN list: every interface')
  t.is(resolveDhtHost('10.0.0.7', ['10.0.0.5:49737']), '10.0.0.7')
  t.is(resolveDhtHost('127.0.0.1', ['127.0.0.1:49737', '127.0.0.2:49738']), '127.0.0.1')
  t.is(resolveDhtHost('127.0.0.1', ['dht.site.lan:49737']), '127.0.0.1', 'hostnames are not resolved')
  t.exception(() => resolveDhtHost('127.0.0.1', ['127.0.0.1:49737', '10.0.0.5:49737']), /ERR_MDK_DHT_HOST_UNREACHABLE: .*10\.0\.0\.5:49737/)
  t.exception(() => resolveDhtHost('::1', ['10.0.0.5:49737']), /ERR_MDK_DHT_HOST_UNREACHABLE/)
})

test('dhtFromEnv - only the keys that are set', (t) => {
  t.alike(dhtFromEnv({}), {})
  t.alike(dhtFromEnv({ MDK_DHT_BOOTSTRAP: '127.0.0.1:49737', MDK_DHT_HOST: '127.0.0.1' }), { bootstrap: ['127.0.0.1:49737'], dhtHost: '127.0.0.1' })
  t.alike(dhtFromEnv({ MDK_DHT_HOST: '10.0.0.7' }), { dhtHost: '10.0.0.7' })
})
