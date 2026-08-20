'use strict'

const crypto = require('node:crypto')

function createLogDownloadResult (archive) {
  if (!Buffer.isBuffer(archive)) throw new Error('ERR_LOG_DOWNLOAD_RESPONSE_INVALID')

  return {
    success: true,
    filename: 'whatsminer-logs.tgz',
    contentType: 'application/gzip',
    encoding: 'base64',
    size: archive.length,
    sha256: crypto.createHash('sha256').update(archive).digest('hex'),
    data: archive.toString('base64')
  }
}

module.exports = createLogDownloadResult
