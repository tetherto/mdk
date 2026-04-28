'use strict'

const crypto = require('crypto')

function getAuthData (username, password, random) {
  // 1. get MD5 of username
  const md5Username = crypto.createHash('md5').update(username).digest()

  // 2. get MD5 of password
  const md5Password = crypto.createHash('md5').update(password).digest()

  // 3. get SHA256 of 1,2
  const sha256 = crypto.createHash('sha256').update(Buffer.concat([random, md5Username, md5Password])).digest()

  return sha256
}

module.exports = {
  getAuthData
}
