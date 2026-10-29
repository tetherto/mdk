'use strict'

const test = require('brittle')
const { resolveDhtOpts } = require('../../../workers/http.node.wrk')

test('resolveDhtOpts - startGateway ctx and service CLI flags give the same DHT options', (t) => {
  t.alike(resolveDhtOpts({}), {}, 'nothing set: hyperdht defaults')
  t.alike(resolveDhtOpts({ kernelBootstrap: ['127.0.0.1:49737'], kernelDhtHost: '127.0.0.1' }), { bootstrap: ['127.0.0.1:49737'], host: '127.0.0.1' })
  t.alike(resolveDhtOpts({ kernelBootstrap: ' 10.0.0.5:49737 ,10.0.0.6:49737' }), { bootstrap: ['10.0.0.5:49737', '10.0.0.6:49737'] }, 'comma-separated flag')
  t.alike(resolveDhtOpts({ kernelBootstrap: [{ host: '10.0.0.5', port: 49737 }] }), { bootstrap: [{ host: '10.0.0.5', port: 49737 }] })
})
