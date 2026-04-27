'use strict'

const { applyFilters } = require('../utils')

class ListingService {
  constructor ({ getThings, rackId, selectThingInfo }) {
    this.getThings = getThings
    this.rackId = rackId
    this.selectThingInfo = selectThingInfo
  }

  prepThingInfo (thg, opts = {}) {
    const pack = {
      id: thg.id,
      code: thg.code,
      type: thg.type,
      tags: thg.tags,
      info: thg.info,
      rack: this.rackId,
      comments: thg.comments,
      ...this.selectThingInfo(thg)
    }

    if (opts.status) {
      pack.last = thg.last
    }

    return pack
  }

  filterThings (req, returnObjects = false) {
    const things = Object.values(this.getThings())
    return applyFilters(things, req, returnObjects)
  }

  listThings (req) {
    const thgs = this.filterThings({
      ...req,
      offset: req.offset ?? 0,
      limit: req.limit ?? 100
    }, true)

    return thgs.map(thg => {
      return this.prepThingInfo(thg, { status: req.status })
    })
  }
}

module.exports = ListingService
