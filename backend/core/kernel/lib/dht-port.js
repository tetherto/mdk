'use strict'

// HyperDHT binds every node to UDP 49737 unless told otherwise, the port a
// private bootstrap (startDhtBootstrap) uses by default and cannot fall back
// from. A node given bootstrap entries searches the PORT_SPAN ports above the
// highest of theirs instead (below the lowest when there is no room above),
// then any free port, so whatever starts first never takes a bootstrap's port.
// A node with no bootstrap list (or none with a port) is left as it is.
// dht-rpc reads `port: [start, end]` as start to end - 1.
const PORT_LIMIT = 65536
const PORT_SPAN = 5

function dhtPortOpts (bootstrap) {
  if (!Array.isArray(bootstrap)) return {}
  const ports = bootstrap
    .map((entry) => Number(entry && typeof entry === 'object' ? entry.port : String(entry).split(':').pop()))
    .filter((port) => Number.isInteger(port) && port > 0 && port < PORT_LIMIT)
  if (!ports.length) return {}
  const above = Math.max(...ports) + 1
  if (above + PORT_SPAN <= PORT_LIMIT) return { port: [above, above + PORT_SPAN] }
  const below = Math.min(...ports)
  return { port: [Math.max(1, below - PORT_SPAN), below] }
}

module.exports = { dhtPortOpts }
