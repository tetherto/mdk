const os = require('os')
const fs = require('fs/promises')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')

const test = require('brittle')
const createTestnet = require('hyperdht/testnet')

const sdk = require('../../..')
const { createMdkClient } = require('../../../../client')

const ACTION_TYPES = {
  // Container actions
  SWITCH_CONTAINER: 'switchContainer',
  SWITCH_COOLING_SYSTEM: 'switchCoolingSystem',
  SET_TANK_ENABLED: 'setTankEnabled',
  SET_AIR_EXHAUST_ENABLED: 'setAirExhaustEnabled',
  RESET_COOLING_SYSTEM: 'resetCoolingSystem',
  SET_LIQUID_SUPPLY_TEMPERATURE: 'setLiquidSupplyTemperature',
  SET_TEMPERATURE_SETTINGS: 'setTemperatureSettings',
  SET_COOLING_FAN_THRESHOLD: 'setCoolingFanThreshold',
  SWITCH_SOCKET: 'switchSocket',
  SET_PLC_REGISTERS: 'setPlcRegisters',
  RESET_ALARM: 'resetAlarm',
  RESET_CONTAINER: 'resetContainer',
  EMERGENCY_STOP: 'emergencyStop',
  MAINTENANCE: 'maintenance',
  // Miner actions
  REBOOT: 'reboot',
  SET_POWER_MODE: 'setPowerMode',
  SET_POWER_PCT: 'setPowerPct',
  SETUP_FREQUENCY_SPEED: 'setUpfreqSpeed',
  SET_LED: 'setLED',
  SETUP_POOLS: 'setupPools',
  // Thing actions (universal — present in every worker contract)
  REGISTER_THING: 'registerThing',
  UPDATE_THING: 'updateThing',
  FORGET_THINGS: 'forgetThings',
  // Rack actions
  RACK_REBOOT: 'rackReboot',
  // Pool Manager actions
  REGISTER_POOL_CONFIG: 'registerConfig',
  UPDATE_POOL_CONFIG: 'updateConfig'
}

const setupTestnet = async ({ t }) => {
  const testnet = await createTestnet(3, t.teardown)
  const bootstrap = testnet.bootstrap

  return {
    testnet,
    bootstrap
  }
}

const createKernel = async ({ root, bootstrap }) => {
  const kernel = await sdk.getKernel({
    root,
    hrpc: {
      whitelist: [],
      bootstrap
    },
    discovery: {
      mode: 'local'
    },
    actionIntvlMs: 1000
  })

  return kernel
}

const workerFactory = ({
  root,
  kernel,
  bootstrap
}) => async ({
  fixture
}) => {
  // Runtime-hosted fixtures (Worker Plugins) bring their own factory and
  // return { workerId, deviceId, stop }.
  return fixture.createWorker({ root, kernel, bootstrap })
}

const createClient = async ({
  bootstrap,
  key
}) => {
  const mdkClient = createMdkClient({
    hrpc: {
      bootstrap,
      key
    }
  })

  await mdkClient.connect()

  return mdkClient
}

const requestWithTimeout = async (cb, {
  timeoutMs = 15000
} = {}) => {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('ERR_HRPC_TIMEOUT')), timeoutMs)
  })

  try {
    return await Promise.race([
      cb(),
      timeout
    ])
  } finally {
    clearTimeout(timer)
  }
}

const dispatchAction = async ({
  mdkClient,
  action
}) => {
  const resp = await requestWithTimeout(() => mdkClient.pushAction(action))
  if (!resp.id) {
    console.log(JSON.stringify({
      msg: 'no command id in response after pushing action',
      resp
    }, null, 2))
    throw new Error('ERR_NO_COMMAND_ID')
  }
  return resp
}

const retry = async (cb, retries = 3, { retryDelayMs = 2000 } = {}) => {
  let lastErr
  for (let i = 0; i < retries; i++) {
    try {
      return await cb()
    } catch (error) {
      lastErr = error
      if (i < retries - 1) await sleep(retryDelayMs)
    }
  }
  throw lastErr
}

const getDoneAction = async ({
  mdkClient,
  id
}) => {
  return await retry(async () => {
    const action = await requestWithTimeout(() => mdkClient.getAction({
      id,
      type: 'done'
    }))

    if (!action || action.error === 'ERR_ACTION_ID_NOT_FOUND') {
      throw new Error('ERR_ACTION_ID_NOT_FOUND')
    }
    return action
  }, 5)
}

const actionTester = ({
  kernel,
  mdkClient
}) => async ({
  action
}) => {
  const { extraVoters, ...actionPayload } = action
  const { id } = await dispatchAction({
    mdkClient, action: actionPayload
  })

  if (extraVoters && extraVoters.length > 0) {
    for (const { voter, authPerms } of extraVoters) {
      await mdkClient.voteAction({ id, voter, approve: true, authPerms })
    }
  }

  await getDoneAction({
    mdkClient, id
  })
}

const getTestHarness = async ({ t }) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mdk-e2e-'))

  const { bootstrap } = await setupTestnet({ t })

  const kernel = await createKernel({
    root,
    bootstrap
  })

  t.teardown(async () => {
    await sdk.shutdown({
      _cleanup: kernel._cleanup,
      stop: kernel.stop.bind(kernel)
    })
  })

  const mdkClient = await createClient({
    bootstrap,
    key: kernel.getPublicKey()
  })

  t.teardown(async () => {
    await mdkClient.close()
  })

  const createWorker = workerFactory({
    root,
    bootstrap,
    kernel
  })

  const testAction = actionTester({
    kernel,
    mdkClient
  })

  return {
    mdkClient,
    createWorker,
    testAction
  }
}

const runFixtureTests = (fixtures, { mockTiming = 'before', preActionDelay = 0 } = {}) => {
  for (const fixture of fixtures) {
    test(`Worker: ${fixture.name}`, { timeout: 3 * 60 * 1000 }, async (t) => {
      const { mdkClient, createWorker, testAction } = await getTestHarness({ t })

      let mock
      if (fixture.mockFactory && mockTiming !== 'after') {
        mock = fixture.mockFactory()
        t.teardown(() => mock.exit(), { order: 1 })
      }

      const worker = await createWorker({ fixture })

      if (fixture.mockFactory && mockTiming === 'after') {
        // Mock must start after the worker so the underlying server is already listening
        mock = fixture.mockFactory()
        t.teardown(() => mock.exit(), { order: 1 })
      }

      t.teardown(async () => {
        await worker.stop()
      })

      await mdkClient.waitForWorkers()

      if (preActionDelay) await sleep(preActionDelay)

      for (const actionEntry of fixture.actions) {
        const action = typeof actionEntry === 'function'
          ? actionEntry(worker.workerId, worker.deviceId)
          : actionEntry

        await t.execution(async () => {
          try {
            await testAction({ action })
          } catch (error) {
            console.error(error.message)
            throw error
          }
        }, `Action: ${action.action} successful`)
      }
    })
  }
}

module.exports = {
  ACTION_TYPES,
  getTestHarness,
  runFixtureTests
}
