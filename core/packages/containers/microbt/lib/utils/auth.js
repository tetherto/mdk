'use strict'

const crypto = require('crypto')
const debug = require('debug')('cdu:auth')

function getAuthData (username, password, random) {
  debug(`getAuthData(${username}, ${password}, ${random})`)

  // 1. get MD5 of username
  const md5Username = crypto.createHash('md5').update(username).digest()
  debug('md5Username', md5Username)

  // 2. get MD5 of password
  const md5Password = crypto.createHash('md5').update(password).digest()
  debug('md5Password', md5Password)

  // 3. get SHA256 of 1,2
  debug('Buffer.concat([random, md5Username, md5Password])', Buffer.concat([random, md5Username, md5Password]))
  const sha256 = crypto.createHash('sha256').update(Buffer.concat([random, md5Username, md5Password])).digest()
  debug('sha256', sha256)

  return sha256
}

module.exports = {
  getAuthData
}
