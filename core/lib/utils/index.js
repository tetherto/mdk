'use strict'

const IntervalsFacility = require('bfx-facs-interval')
const StoreFacility = require('hp-svc-facs-store')
const ActionApproverFacility = require('svc-facs-action-approver')

const _startFacility = (facility) => {
  return new Promise((resolve, reject) => {
    facility.start((err) => (err ? reject(err) : resolve()))
  })
}

const createFacs = async (storeDir, ctx = {}) => {
  const facs = {}
  facs.interval_0 = new IntervalsFacility(null, {}, ctx)
  await _startFacility(facs.interval_0)

  facs.store_s1 = new StoreFacility(null, { storeDir }, ctx)
  await _startFacility(facs.store_s1)

  facs.actionApprover_0 = new ActionApproverFacility(null, {}, ctx)
  await _startFacility(facs.actionApprover_0)

  return facs
}

module.exports = {
  createFacs
}
