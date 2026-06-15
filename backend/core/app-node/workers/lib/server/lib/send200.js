'use strict'

function send200 (rep, data) {
  rep.status(200).send(data)
}

module.exports = {
  send200
}
