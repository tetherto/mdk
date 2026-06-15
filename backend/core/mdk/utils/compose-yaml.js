'use strict'

function yamlScalar (value) {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  const str = String(value)
  if (/^[a-zA-Z0-9._/-]+$/.test(str)) return str
  return JSON.stringify(str)
}

function yamlEnv (env) {
  const lines = ['    environment:']
  for (const [key, val] of Object.entries(env)) {
    lines.push(`      ${key}: ${yamlScalar(val)}`)
  }
  return lines
}

function buildComposeYaml (compose) {
  const lines = [`version: "${compose.version}"`, 'services:']

  for (const [name, svc] of Object.entries(compose.services)) {
    lines.push(`  ${name}:`)
    lines.push(`    image: ${yamlScalar(svc.image)}`)
    if (svc.working_dir) lines.push(`    working_dir: ${yamlScalar(svc.working_dir)}`)
    if (svc.entrypoint) {
      lines.push(`    entrypoint: [${svc.entrypoint.map((c) => JSON.stringify(c)).join(', ')}]`)
    }
    if (svc.command) {
      const cmd = Array.isArray(svc.command) ? svc.command : [svc.command]
      lines.push(`    command: [${cmd.map((c) => JSON.stringify(c)).join(', ')}]`)
    }
    if (svc.restart) lines.push(`    restart: ${yamlScalar(svc.restart)}`)
    lines.push(...yamlEnv(svc.environment))
    if (svc.ports?.length) {
      lines.push('    ports:')
      for (const port of svc.ports) lines.push(`      - "${port}"`)
    }
    if (svc.volumes?.length) {
      lines.push('    volumes:')
      for (const vol of svc.volumes) lines.push(`      - ${vol}`)
    }
  }

  if (compose.volumes) {
    lines.push('volumes:')
    for (const volName of Object.keys(compose.volumes)) {
      lines.push(`  ${volName}:`)
    }
  }

  return lines.join('\n') + '\n'
}

module.exports = { buildComposeYaml }
