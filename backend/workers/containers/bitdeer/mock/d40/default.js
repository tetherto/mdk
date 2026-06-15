'use strict'

const fs = require('fs')
const initialState = require('./initialState.js')

// Hardcoded to 5000 as the it's hardcoded in the container
const UPDATE_STATE_INTERVAL = 5000

module.exports = function (ctx, server, existedState) {
  const intervals = []
  const id = ctx.id
  const _cmds = {}
  const _state = existedState || initialState(ctx).state

  function publishAll () {
    fs.readdirSync('./mock/d40/data').forEach(file => {
      const name = file.split('.')[0]
      const data = require(`./data/${file}`)
      const payload = data(ctx, _state)
      server.publish(`${id}${name}`, payload)
    })
  }

  server.once('connect', publishAll)

  fs.readdirSync('./mock/d40/data').forEach(file => {
    const name = file.split('.')[0]
    const data = require(`./data/${file}`)

    intervals.push(setInterval(() => {
      const payload = data(ctx, _state)
      server.publish(
        `${id}${name}`,
        payload
      )
    }, UPDATE_STATE_INTERVAL))
  })

  fs.readdirSync('./mock/d40/cmd').forEach(file => {
    const name = file.split('.')[0]
    const cmd = require(`./cmd/${file}`)
    _cmds[name] = cmd

    server.subscribe(`${id}${name}`)
  })

  server.on('message', function (topic, payload) {
    const name = topic.replace(id, '')
    const cmd = _cmds[name]

    if (cmd) {
      cmd(_state, { payload }, () => {})
    }
  })

  return () => {
    intervals.forEach(clearInterval)
  }
}
