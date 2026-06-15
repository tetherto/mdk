'use strict'

const test = require('brittle')
const CommentsService = require('../../lib/services/comments.service')

let _idCounter = 0
function makeService (thgStore = {}) {
  const db = { ...thgStore }

  const svc = new CommentsService({
    loadThing: async (req) => {
      const thg = db[req.thingId]
      if (!thg) throw new Error('ERR_THING_NOTFOUND')
      return JSON.parse(JSON.stringify(thg))
    },
    saveThing: async (thg) => {
      db[thg.id] = thg
    },
    checkThingExists: (req) => {
      if (!db[req.thingId]) throw new Error('ERR_THING_NOTFOUND')
    },
    generateId: () => `id-${++_idCounter}`
  })

  return { svc, db }
}

function seed (db, thg) {
  db[thg.id] = thg
}

// ---------------------------------------------------------------------------
// saveThingComment
// ---------------------------------------------------------------------------

test('saveThingComment returns 1 and persists comment', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [] })

  const result = await svc.saveThingComment({ thingId: 'thg-1', comment: 'hello', user: 'alice' })
  t.is(result, 1)
  t.is(db['thg-1'].comments.length, 1)
  t.is(db['thg-1'].comments[0].comment, 'hello')
  t.is(db['thg-1'].comments[0].user, 'alice')
})

test('saveThingComment initialises comments array when missing', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1' })
  await svc.saveThingComment({ thingId: 'thg-1', comment: 'hi', user: 'bob' })
  t.ok(Array.isArray(db['thg-1'].comments))
})

test('saveThingComment includes pos when provided', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [] })
  await svc.saveThingComment({ thingId: 'thg-1', comment: 'hi', user: 'bob', pos: 'A1' })
  t.is(db['thg-1'].comments[0].pos, 'A1')
})

test('saveThingComment does not include pos when not provided', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [] })
  await svc.saveThingComment({ thingId: 'thg-1', comment: 'hi', user: 'bob' })
  t.absent(Object.prototype.hasOwnProperty.call(db['thg-1'].comments[0], 'pos'))
})

test('saveThingComment assigns unique id to each comment', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [] })
  await svc.saveThingComment({ thingId: 'thg-1', comment: 'a', user: 'u1' })
  await svc.saveThingComment({ thingId: 'thg-1', comment: 'b', user: 'u1' })
  const [c1, c2] = db['thg-1'].comments
  t.ok(c1.id !== c2.id)
})

test('saveThingComment throws ERR_THING_NOTFOUND for unknown thing', async (t) => {
  const { svc } = makeService()
  await t.exception(svc.saveThingComment({ thingId: 'missing', comment: 'x', user: 'u' }), /ERR_THING_NOTFOUND/)
})

// ---------------------------------------------------------------------------
// editThingComment
// ---------------------------------------------------------------------------

test('editThingComment updates comment text and returns 1', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'old', user: 'alice' }] })
  const result = await svc.editThingComment({ thingId: 'thg-1', id: 'c1', comment: 'new', user: 'alice' })
  t.is(result, 1)
  t.is(db['thg-1'].comments[0].comment, 'new')
})

test('editThingComment finds comment by ts when id is not provided', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1234, comment: 'old', user: 'alice' }] })
  await svc.editThingComment({ thingId: 'thg-1', ts: 1234, comment: 'updated', user: 'alice' })
  t.is(db['thg-1'].comments[0].comment, 'updated')
})

test('editThingComment throws ERR_COMMENT_ACCESS_DENIED for wrong user', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'text', user: 'alice' }] })
  await t.exception(
    svc.editThingComment({ thingId: 'thg-1', id: 'c1', comment: 'hack', user: 'eve' }),
    /ERR_COMMENT_ACCESS_DENIED/
  )
})

test('editThingComment throws ERR_THING_COMMENT_NOTFOUND when id does not match', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'text', user: 'alice' }] })
  await t.exception(
    svc.editThingComment({ thingId: 'thg-1', id: 'wrong-id', comment: 'x', user: 'alice' }),
    /ERR_THING_COMMENT_NOTFOUND/
  )
})

test('editThingComment throws ERR_THING_COMMENTS_NOTFOUND when comments is not an array', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: null })
  await t.exception(
    svc.editThingComment({ thingId: 'thg-1', id: 'c1', comment: 'x', user: 'alice' }),
    /ERR_THING_COMMENTS_NOTFOUND/
  )
})

// ---------------------------------------------------------------------------
// deleteThingComment
// ---------------------------------------------------------------------------

test('deleteThingComment removes comment and returns 1', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'bye', user: 'alice' }] })
  const result = await svc.deleteThingComment({ thingId: 'thg-1', id: 'c1', user: 'alice' })
  t.is(result, 1)
  t.is(db['thg-1'].comments.length, 0)
})

test('deleteThingComment finds comment by ts', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 9999, comment: 'bye', user: 'alice' }] })
  await svc.deleteThingComment({ thingId: 'thg-1', ts: 9999, user: 'alice' })
  t.is(db['thg-1'].comments.length, 0)
})

test('deleteThingComment throws ERR_COMMENT_ACCESS_DENIED for wrong user', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'text', user: 'alice' }] })
  await t.exception(
    svc.deleteThingComment({ thingId: 'thg-1', id: 'c1', user: 'eve' }),
    /ERR_COMMENT_ACCESS_DENIED/
  )
})

test('deleteThingComment throws ERR_THING_COMMENT_NOTFOUND for unknown comment', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: [{ id: 'c1', ts: 1000, comment: 'text', user: 'alice' }] })
  await t.exception(
    svc.deleteThingComment({ thingId: 'thg-1', id: 'no-such', user: 'alice' }),
    /ERR_THING_COMMENT_NOTFOUND/
  )
})

test('deleteThingComment throws ERR_THING_COMMENTS_NOTFOUND when comments is not an array', async (t) => {
  const { svc, db } = makeService()
  seed(db, { id: 'thg-1', comments: null })
  await t.exception(
    svc.deleteThingComment({ thingId: 'thg-1', id: 'c1', user: 'alice' }),
    /ERR_THING_COMMENTS_NOTFOUND/
  )
})

test('deleteThingComment only removes the targeted comment when multiple exist', async (t) => {
  const { svc, db } = makeService()
  seed(db, {
    id: 'thg-1',
    comments: [
      { id: 'c1', ts: 1000, comment: 'first', user: 'alice' },
      { id: 'c2', ts: 2000, comment: 'second', user: 'alice' }
    ]
  })
  await svc.deleteThingComment({ thingId: 'thg-1', id: 'c1', user: 'alice' })
  t.is(db['thg-1'].comments.length, 1)
  t.is(db['thg-1'].comments[0].id, 'c2')
})
