'use strict'

const test = require('brittle')
const { buildComposeYaml } = require('../../utils/compose-yaml')

test('buildComposeYaml renders a minimal service', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      web: {
        image: 'node:24',
        environment: { NODE_ENV: 'production' }
      }
    }
  })

  t.ok(yaml.includes('version: "3.8"'))
  t.ok(yaml.includes('  web:'))
  t.ok(yaml.includes('    image: "node:24"'))
  t.ok(yaml.includes('      NODE_ENV: production'))
  t.ok(yaml.endsWith('\n'))
})

test('buildComposeYaml quotes scalars that need it and passes through numbers/booleans', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      web: {
        image: 'node:24',
        environment: {
          PORT: 3000,
          DEBUG: true,
          MESSAGE: 'hello world'
        }
      }
    }
  })

  t.ok(yaml.includes('PORT: 3000'))
  t.ok(yaml.includes('DEBUG: true'))
  t.ok(yaml.includes('MESSAGE: "hello world"'))
})

test('buildComposeYaml includes working_dir, entrypoint, command, restart when present', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      worker: {
        image: 'node:24',
        working_dir: '/app',
        entrypoint: ['sh', 'entrypoint.sh'],
        command: ['npm', 'start'],
        restart: 'unless-stopped',
        environment: {}
      }
    }
  })

  t.ok(yaml.includes('working_dir: /app'))
  t.ok(yaml.includes('entrypoint: ["sh", "entrypoint.sh"]'))
  t.ok(yaml.includes('command: ["npm", "start"]'))
  t.ok(yaml.includes('restart: unless-stopped'))
})

test('buildComposeYaml wraps a single command string in an array', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      worker: {
        image: 'node:24',
        command: 'npm start',
        environment: {}
      }
    }
  })

  t.ok(yaml.includes('command: ["npm start"]'))
})

test('buildComposeYaml renders ports and volumes lists when present', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      gateway: {
        image: 'node:24',
        environment: {},
        ports: ['3000:3000'],
        volumes: ['/host:/container:cached']
      }
    }
  })

  t.ok(yaml.includes('    ports:'))
  t.ok(yaml.includes('      - "3000:3000"'))
  t.ok(yaml.includes('    volumes:'))
  t.ok(yaml.includes('      - /host:/container:cached'))
})

test('buildComposeYaml omits ports/volumes when absent or empty', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      gateway: {
        image: 'node:24',
        environment: {},
        ports: [],
        volumes: []
      }
    }
  })

  t.absent(yaml.includes('ports:'))
  t.absent(yaml.includes('volumes:'))
})

test('buildComposeYaml renders top-level volumes section when present', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      gateway: { image: 'node:24', environment: {} }
    },
    volumes: { 'data-vol': {} }
  })

  t.ok(yaml.includes('volumes:\n  data-vol:'))
})

test('buildComposeYaml renders multiple services in insertion order', (t) => {
  const yaml = buildComposeYaml({
    version: '3.8',
    services: {
      a: { image: 'a:1', environment: {} },
      b: { image: 'b:1', environment: {} }
    }
  })

  t.ok(yaml.indexOf('  a:') < yaml.indexOf('  b:'))
})
