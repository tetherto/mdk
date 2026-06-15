'use strict'

const { MAPPINGS } = require('./constants')
const debug = require('debug')('optimize')
const { cloneDeep } = require('@bitfinex/lib-js-util-base')

const ALL_PDUS = '-1'
const ALL_SOCKETS = '-1'
const ALL_SOCKETS_NUM = -1

const applyOperationToState = (modState, op, type) => {
  const [pduKey, socketKey, enabled] = op

  // Handle all PDUs operations
  if (pduKey === ALL_PDUS) {
    if (socketKey === ALL_SOCKETS) {
      // All PDUs, all sockets
      modState?.forEach(pdu => {
        if (pdu?.socketStatus) {
          pdu.socketStatus = pdu.socketStatus.map(() => enabled)
        }
      })
    } else {
      // All PDUs, specific socket
      modState?.forEach(pdu => {
        if (pdu?.socketStatus) {
          const pduName = Object.keys(MAPPINGS[type])[pdu.index]
          const socketIndex = MAPPINGS[type][pduName]?.indexOf(socketKey)
          if (socketIndex !== -1 && socketIndex < pdu.socketStatus.length) {
            pdu.socketStatus[socketIndex] = enabled
          }
        }
      })
    }
    return
  }

  // Handle specific PDU operations
  const pduIndex = Object.keys(MAPPINGS[type]).indexOf(pduKey)
  if (pduIndex === -1 || !modState[pduIndex]) {
    return
  }

  const pdu = modState[pduIndex]
  if (!pdu?.socketStatus) {
    return
  }

  if (socketKey === ALL_SOCKETS) {
    // Specific PDU, all sockets
    pdu.socketStatus = pdu.socketStatus.map(() => enabled)
  } else {
    // Specific PDU, specific socket
    const socketIndex = MAPPINGS[type][pduKey]?.indexOf(socketKey)
    if (socketIndex !== -1 && socketIndex < pdu.socketStatus.length) {
      pdu.socketStatus[socketIndex] = enabled
    }
  }
}

const convertStateToOps = (modState, type) => {
  const convertedState = []
  const pduKeys = Object.keys(MAPPINGS[type])

  for (const pdu of modState) {
    if (!pdu?.socketStatus) {
      continue
    }

    const pduKey = pduKeys[pdu.index]
    if (!pduKey) {
      continue
    }

    pdu.socketStatus.forEach((socketValue, index) => {
      const socketKey = MAPPINGS[type][pduKey]?.[index]
      if (socketKey !== undefined && socketKey !== null) {
        convertedState.push([pduKey, socketKey, socketValue])
      }
    })
  }

  return convertedState
}

const checkAllSocketsState = (convertedState) => {
  if (convertedState.length === 0) {
    return { allOn: false, allOff: true }
  }

  const allOn = convertedState.every(op => op[2] === true)
  const allOff = convertedState.every(op => op[2] === false)

  return { allOn, allOff }
}

const groupOperationsByPDU = (ops) => {
  return ops.reduce((acc, op) => {
    const pduKey = op[0]
    if (!acc[pduKey]) {
      acc[pduKey] = {
        on: [],
        off: []
      }
    }
    if (op[2]) {
      acc[pduKey].on.push(op)
    } else {
      acc[pduKey].off.push(op)
    }
    return acc
  }, {})
}

const setOpsForPduOn = (pduKey, state, type, newOps) => {
  const pduIndex = Object.keys(MAPPINGS[type]).indexOf(pduKey)
  if (pduIndex !== -1 && state[pduIndex]?.socketStatus) {
    const allSocketsOn = state[pduIndex].socketStatus.every(status => status === true)
    if (!allSocketsOn) {
      // State will change, include the operation
      newOps.push([pduKey, ALL_SOCKETS_NUM, true])
    }
  } else {
    // Include it if we can't verify state
    newOps.push([pduKey, ALL_SOCKETS_NUM, true])
  }
}

const setOpsForPduOff = (pduKey, state, type, newOps) => {
  const pduIndex = Object.keys(MAPPINGS[type]).indexOf(pduKey)
  if (pduIndex !== -1 && state[pduIndex]?.socketStatus) {
    const allSocketsOff = state[pduIndex].socketStatus.every(status => status === false)
    if (!allSocketsOff) {
      // State will change, include the operation
      newOps.push([pduKey, ALL_SOCKETS_NUM, false])
    }
  } else {
    // Include it if we can't verify state
    newOps.push([pduKey, ALL_SOCKETS_NUM, false])
  }
}

const setOpsUnchagedState = (pduKey, pduOps, state, type, newOps) => {
  const { on: pduOnOps, off: pduOffOps } = pduOps
  const pduIndex = Object.keys(MAPPINGS[type]).indexOf(pduKey)
  if (pduIndex === -1 || !state[pduIndex]?.socketStatus) {
    return newOps
  }

  const currentSocketStatus = state[pduIndex].socketStatus

  for (const op of [...pduOnOps, ...pduOffOps]) {
    const socketKey = op[1]
    const socketIndex = MAPPINGS[type][pduKey]?.indexOf(socketKey)

    if (socketIndex === -1 || socketIndex >= currentSocketStatus.length) {
      continue
    }

    debug(`op: ${op}`)
    debug(`socketState: ${currentSocketStatus[socketIndex]}`)

    // Only include operations that change the state
    if (currentSocketStatus[socketIndex] !== op[2]) {
      newOps.push(op)
    }
  }
}

const optimizePDUOperations = (pduKey, pduOps, state, type) => {
  const { on: pduOnOps, off: pduOffOps } = pduOps
  const socketLength = MAPPINGS[type][pduKey]?.length || 0
  const newOps = []

  debug(`pdu: ${pduKey} pduOnOps: ${pduOnOps.length}, pduOffOps: ${pduOffOps.length}`)

  // Check if we have PDU-level operations (socketKey is '-1' or -1)
  const hasPDULevelOn = pduOnOps.some(op => op[1] === ALL_SOCKETS || op[1] === ALL_SOCKETS_NUM)
  const hasPDULevelOff = pduOffOps.some(op => op[1] === ALL_SOCKETS || op[1] === ALL_SOCKETS_NUM)

  // If we have a PDU-level operation, keep it if state changes
  if (hasPDULevelOn) {
    setOpsForPduOn(pduKey, state, type, newOps)
  } else if (hasPDULevelOff) {
    setOpsForPduOff(pduKey, state, type, newOps)
  } else if (pduOnOps.length === socketLength) {
    // All individual sockets are being turned on
    newOps.push([pduKey, ALL_SOCKETS_NUM, true])
  } else if (pduOffOps.length === socketLength) {
    // All individual sockets are being turned off
    newOps.push([pduKey, ALL_SOCKETS_NUM, false])
  } else {
    setOpsUnchagedState(pduKey, pduOps, state, type, newOps)
  }

  return newOps
}

const optimizeSocketCalls = (ops, state, type) => {
  if (!ops || ops.length === 0) {
    // If no operations, check if we should return all-off
    const convertedState = convertStateToOps(state || [], type)
    const { allOff } = checkAllSocketsState(convertedState)
    return allOff ? [[ALL_PDUS, ALL_SOCKETS, false]] : []
  }

  // Apply operations to a deep copy of state
  const modState = cloneDeep(state || [])
  for (const op of ops) {
    applyOperationToState(modState, op, type)
  }

  // Convert modified state back to operations format
  const convertedState = convertStateToOps(modState, type)
  debug('convertedState', convertedState)

  // Check if all sockets end up in the same state
  const { allOn, allOff } = checkAllSocketsState(convertedState)
  debug(`allOn: ${allOn}, allOff: ${allOff}`)

  // Check if original operations contain PDU-level operations
  const hasPDULevelOps = ops.some(op => op[1] === ALL_SOCKETS || op[1] === ALL_SOCKETS_NUM)
  const hasGlobalOps = ops.some(op => op[0] === ALL_PDUS)
  if ((allOn || allOff) && (!hasPDULevelOps || hasGlobalOps)) {
    return [[ALL_PDUS, ALL_SOCKETS, !!allOn]]
  }

  // Group operations by PDU and optimize
  const sortedOps = groupOperationsByPDU(ops)
  const newOps = []

  for (const pduKey of Object.keys(sortedOps)) {
    // Skip if PDU key is ALL_PDUS
    if (pduKey === ALL_PDUS) {
      // For '-1' PDU operations, we need to handle them differently
      // They apply to all PDUs, so we can't optimize them at PDU level
      newOps.push(...sortedOps[pduKey].on, ...sortedOps[pduKey].off)
      continue
    }

    const optimizedPDUOps = optimizePDUOperations(pduKey, sortedOps[pduKey], state, type)
    newOps.push(...optimizedPDUOps)
  }

  debug(`optimized ${ops.length} operations to ${newOps.length}`)

  return newOps
}

module.exports = {
  optimizeSocketCalls
}
