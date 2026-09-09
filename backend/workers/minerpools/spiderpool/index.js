'use strict'

module.exports = {
  plugin: require('./plugin'),
  startSpiderpoolWorker: require('./plugin/boot').startSpiderpoolWorker,
  SPIDER_POOL: require('./lib/spider.minerpool.manager')
}
