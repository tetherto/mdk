'use strict'

const mingo = require('mingo')
const debug = require('debug')('mock')

const parseBody = (body) => {
  if (body == null) return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (_) {
      return {}
    }
  }
  return body
}

const findDevice = (request) => {
  const { params: { id }, ctx: { things } } = request

  return things?.find(device => device.id === id || device.mockId === id)
}

const routes = {
  '/things': {
    get: async (req, res) => {
      const query = JSON.parse(req.query.q || '{}')
      const cursor = mingo.find(req.ctx.things, query)
      const things = cursor.all()
      res.send(things)
    }
  },
  '/thing/:id': {
    post: async (req, res) => {
      const device = findDevice(req)

      if (device) {
        const body = parseBody(req.body)
        if (body.offline) {
          device.stop()
        } else {
          device.start()
        }
        if (body.state && typeof body.state === 'object') {
          Object.assign(device.state, body.state)
        }

        debug('device.state', device.state)
        return res.send({ ok: true })
      }
      return res.status(404).send({
        error: 'thing not found'
      })
    }
  },
  '/thing/:id/reset': {
    post: async (req, res) => {
      const device = findDevice(req)

      if (device) {
        device.state = device.reset()
        debug('device.state reset', device.state)
        return res.send({ ok: true })
      }
      return res.status(404).send({
        error: 'thing not found'
      })
    }
  }
}

module.exports = routes
