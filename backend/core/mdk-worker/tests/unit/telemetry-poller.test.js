'use strict'

const test = require('brittle')
const { createPoller } = require('../../lib/telemetry')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('poller - runs on the interval until stopped, never overlapping itself', async (t) => {
  let runs = 0
  let active = 0
  let overlapped = false
  const poller = createPoller(10, async () => {
    active++
    if (active > 1) overlapped = true
    runs++
    await sleep(25)
    active--
  })

  poller.start()
  poller.start()
  await sleep(120)
  await poller.stop()
  const seen = runs
  await sleep(60)

  t.ok(seen >= 2 && seen <= 5, `ran ${seen} times with a 25ms body on a 10ms interval`)
  t.is(runs, seen, 'no runs after stop()')
  t.is(overlapped, false)
})

test('poller - stop() waits for the in-flight run', async (t) => {
  let done = false
  const poller = createPoller(5, async () => { await sleep(30); done = true })
  poller.start()
  await sleep(10)
  await poller.stop()
  t.is(done, true)
})

test('poller - a throwing run does not stop the interval', async (t) => {
  let runs = 0
  const poller = createPoller(5, async () => { runs++; throw new Error('boom') })
  poller.start()
  await sleep(40)
  await poller.stop()
  t.ok(runs >= 2)
})

test('poller - start() runs once at once, then on the interval', async (t) => {
  let runs = 0
  const poller = createPoller(1000, async () => { runs++ })
  poller.start()
  t.is(runs, 1, 'the first run does not wait for the interval')
  await poller.stop()
  t.is(runs, 1, 'stop() runs nothing')

  const deferred = createPoller(1000, async () => { runs++ }, { immediate: false })
  deferred.start()
  t.is(runs, 1, 'immediate: false waits for the interval')
  await deferred.stop()
})
