'use strict'

module.exports = {
  plugin: require('./plugin'),
  startWhatsminerWorker: require('./plugin/boot').startWhatsminerWorker,
  WhatsminerApiV2Client: require('./lib/whatsminer-api-v2-client'),
  // Backward-compatible export. Prefer WhatsminerApiV2Client in new code.
  Whatsminer: require('./lib/whatsminer'),
  WhatsminerApiV3Client: require('./lib/whatsminer-api-v3-client')
}
