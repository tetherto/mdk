'use strict'

const fs = require('fs')
const path = require('path')
const { MDK_ROOT, LIB_TYPES } = require('./constants')

const coreRoot = path.join(__dirname, '..', '..')
const localPackages = path.join(__dirname, '..', '..', 'packages')
const THING_CONFIG_SOURCES = [
  {
    destDir: 'types/AntminerManagerS19xp/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.ANTMINER, 'config'), path.join(localPackages, 'miners', 'antminer', 'config')]
  },
  {
    destDir: 'types/AvalonMinerManagerA1346/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.AVALON, 'config'), path.join(localPackages, 'miners', 'avalon', 'config')]
  },
  {
    destDir: 'types/WhatsminerManagerM56s/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.WHATSMINER, 'config'), path.join(localPackages, 'miners', 'whatsminer', 'config')]
  },
  {
    destDir: 'types/BitdeerManagerD40M56/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.BITDEER, 'config'), path.join(localPackages, 'containers', 'bitdeer', 'config')]
  },
  {
    destDir: 'types/AnstspaceManagerHK3/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.ANTSPACE, 'config'), path.join(localPackages, 'containers', 'antspace', 'config')]
  },
  {
    destDir: 'types/B23PowerMeterManager/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.ABB, 'config'), path.join(localPackages, 'powermeters', 'abb', 'config')]
  },
  {
    destDir: 'types/TempSenecaSensorManager/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.SENECA, 'config'), path.join(localPackages, 'sensors', 'seneca', 'config')]
  }
]

// Resolved from core/tmp/workers/http.node.wrk.js → core/packages/mdk/app-node/...
const HTTP_NODE_WRK_STUB =
  "module.exports = require('../../packages/mdk/app-node/workers/http.node.wrk')\n"

const TEMPLATE = {
  dirs: [
    'config/facs',
    'db',
    'types/AntminerManagerS19xp/config',
    'types/AvalonMinerManagerA1346/config',
    'types/WhatsminerManagerM56s/config',
    'types/BitdeerManagerD40M56/config',
    'types/AnstspaceManagerHK3/config',
    'types/MicroBTManagerHK3/config',
    'types/B23PowerMeterManager/config',
    'types/TempSenecaSensorManager/config',
    'workers'
  ],
  files: {
    'workers/http.node.wrk.js': HTTP_NODE_WRK_STUB
  }
}

const resolveSource = (dir, filename) => {
  const plain = path.join(dir, filename)
  const example = path.join(dir, `${filename}.example`)
  if (fs.existsSync(plain)) return plain
  if (fs.existsSync(example)) return example
  return null
}

const ensureThingConfigs = (rootStoreDir) => {
  for (const { destDir, srcDirs } of THING_CONFIG_SOURCES) {
    const configDir = path.join(rootStoreDir, destDir)
    fs.mkdirSync(configDir, { recursive: true })
    const dest = path.join(configDir, 'base.thing.json')
    if (!fs.existsSync(dest)) {
      const src = (srcDirs || []).reduce((found, dir) => {
        if (found) return found
        return resolveSource(dir, 'base.thing.json')
      }, null)
      if (src) fs.copyFileSync(src, dest)
    }
  }
}

module.exports = () => {
  const rootStoreDir = path.join(coreRoot, MDK_ROOT)

  for (const dir of TEMPLATE.dirs) {
    fs.mkdirSync(path.join(rootStoreDir, dir), { recursive: true })
  }

  const commonDest = path.join(rootStoreDir, 'config', 'common.json')
  if (!fs.existsSync(commonDest)) {
    const src = resolveSource(path.join(localPackages, LIB_TYPES.APP_NODE, 'config'), 'common.json')
    if (src) fs.copyFileSync(src, commonDest)
  }

  const orkConfDir = path.join(localPackages, LIB_TYPES.ORK, 'config')
  for (const entry of fs.readdirSync(orkConfDir)) {
    if (!entry.endsWith('.example')) continue
    const filename = entry.slice(0, -'.example'.length)
    const dest = path.join(rootStoreDir, 'config', filename)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(orkConfDir, entry), dest)
    }
  }

  const appNodeConfigsDir = path.join(localPackages, LIB_TYPES.APP_NODE, 'config', 'facs')
  for (const entry of fs.readdirSync(appNodeConfigsDir)) {
    if (!entry.endsWith('.example')) continue
    const filename = entry.slice(0, -'.example'.length)
    const dest = path.join(rootStoreDir, 'config', 'facs', filename)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(appNodeConfigsDir, entry), dest)
    }
  }

  for (const [relPath, content] of Object.entries(TEMPLATE.files)) {
    const filePath = path.join(rootStoreDir, relPath)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf8')
      continue
    }
  }

  if (fs.existsSync(rootStoreDir)) {
    ensureThingConfigs(rootStoreDir)
  }
}
