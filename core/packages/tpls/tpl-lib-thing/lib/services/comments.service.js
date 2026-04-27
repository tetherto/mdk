'use strict'

class CommentsService {
  constructor ({ loadThing, saveThing, checkThingExists, generateId }) {
    this.loadThing = loadThing
    this.saveThing = saveThing
    this.checkThingExists = checkThingExists
    this.generateId = generateId
  }

  _findCommentIndex (thg, req) {
    if (req.id) {
      return thg.comments.findIndex(c => c.id === req.id)
    }
    if (req.ts) {
      return thg.comments.findIndex(c => c.ts === req.ts)
    }
    return -1
  }

  _checkCommentPermission (thg, commentIndex, req) {
    if (thg.comments[commentIndex].user !== req.user) {
      throw new Error('ERR_COMMENT_ACCESS_DENIED')
    }
  }

  async saveThingComment (req) {
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) thg.comments = []

    thg.comments.push({
      id: this.generateId(),
      ts: Date.now(),
      comment: req.comment,
      user: req.user,
      ...(req.pos ? { pos: req.pos } : {})
    })

    await this.saveThing(thg)

    return 1
  }

  async editThingComment (req) {
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) throw new Error('ERR_THING_COMMENTS_NOTFOUND')

    const commentIndex = this._findCommentIndex(thg, req)
    if (commentIndex === -1) throw new Error('ERR_THING_COMMENT_NOTFOUND')

    this._checkCommentPermission(thg, commentIndex, req)

    thg.comments[commentIndex].comment = req.comment

    await this.saveThing(thg)

    return 1
  }

  async deleteThingComment (req) {
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) throw new Error('ERR_THING_COMMENTS_NOTFOUND')

    const commentIndex = this._findCommentIndex(thg, req)
    if (commentIndex === -1) throw new Error('ERR_THING_COMMENT_NOTFOUND')

    this._checkCommentPermission(thg, commentIndex, req)

    thg.comments.splice(commentIndex, 1)

    await this.saveThing(thg)

    return 1
  }
}

module.exports = CommentsService
