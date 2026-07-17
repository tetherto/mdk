'use strict'

const test = require('brittle')
const CommentsService = require('../../lib/services/comments.service')

function createService (records = {}) {
  let seq = 0
  const svc = new CommentsService({
    loadThing: async (req) => records[req.thingId],
    saveThing: async (thg) => { records[thg.id] = thg },
    checkThingExists: (req) => {
      if (!records[req.thingId]) throw new Error('ERR_THING_NOTFOUND')
    },
    generateId: () => `c-${++seq}`
  })
  return { svc, records }
}

test('saveThingComment appends a comment with id/ts/user', async (t) => {
  const { svc, records } = createService({ d1: { id: 'd1' } })

  const res = await svc.saveThingComment({ thingId: 'd1', comment: 'hello', user: 'op' })
  t.is(res, 1)
  t.is(records.d1.comments.length, 1)
  t.is(records.d1.comments[0].comment, 'hello')
  t.is(records.d1.comments[0].user, 'op')
  t.is(records.d1.comments[0].id, 'c-1')
})

test('saveThingComment rejects unknown device', async (t) => {
  const { svc } = createService()
  await t.exception(svc.saveThingComment({ thingId: 'nope', comment: 'x', user: 'op' }), /ERR_THING_NOTFOUND/)
})

test('editThingComment enforces ownership and existence', async (t) => {
  const { svc, records } = createService({ d1: { id: 'd1' } })
  await svc.saveThingComment({ thingId: 'd1', comment: 'v1', user: 'op' })
  const commentId = records.d1.comments[0].id

  await t.exception(svc.editThingComment({ thingId: 'd1', id: 'missing', comment: 'x', user: 'op' }), /ERR_THING_COMMENT_NOTFOUND/)
  await t.exception(svc.editThingComment({ thingId: 'd1', id: commentId, comment: 'x', user: 'other' }), /ERR_COMMENT_ACCESS_DENIED/)

  await svc.editThingComment({ thingId: 'd1', id: commentId, comment: 'v2', user: 'op' })
  t.is(records.d1.comments[0].comment, 'v2')
})

test('deleteThingComment removes the comment', async (t) => {
  const { svc, records } = createService({ d1: { id: 'd1' } })
  await svc.saveThingComment({ thingId: 'd1', comment: 'v1', user: 'op' })
  const commentId = records.d1.comments[0].id

  await t.exception(svc.deleteThingComment({ thingId: 'd1', id: commentId, user: 'other' }), /ERR_COMMENT_ACCESS_DENIED/)

  await svc.deleteThingComment({ thingId: 'd1', id: commentId, user: 'op' })
  t.is(records.d1.comments.length, 0)

  await t.exception(svc.deleteThingComment({ thingId: 'd1', id: commentId, user: 'op' }), /ERR_THING_COMMENT_NOTFOUND/)
})
