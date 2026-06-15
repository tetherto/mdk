import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export type CheckOptions = {
  file: string
  cwd: string
  out?: (line: string) => void
}

export type CheckError = {
  file: string
  line: number
  column: number
  code: string
  severity: 'error' | 'warning'
  message: string
  source: 'tsc' | 'eslint'
}

export type CheckResult = {
  file: string
  ok: boolean
  errors: CheckError[]
  /** V1 gap: render-time errors are not checked. See README. */
  renderValidation: 'not-checked'
  lintValidation: 'ok' | 'skipped' | 'error'
}

const TS_DIAG_RE = /^([^()]+)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/

const parseTscOutput = (stdout: string, rootDir: string): CheckError[] => {
  const errors: CheckError[] = []
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const match = TS_DIAG_RE.exec(line)
    if (!match) continue
    const [, file, lineStr, colStr, severity, code, message] = match
    errors.push({
      file: isAbsolute(file!) ? file! : join(rootDir, file!),
      line: Number(lineStr),
      column: Number(colStr),
      severity: severity as 'error' | 'warning',
      code: code!,
      message: message!,
      source: 'tsc',
    })
  }
  return errors
}

type EslintMessage = {
  ruleId: string | null
  severity: 1 | 2
  message: string
  line: number
  column: number
}

type EslintFileResult = {
  filePath: string
  messages: EslintMessage[]
}

const runEslint = (absFile: string, cwd: string): CheckError[] | null => {
  const result = spawnSync('npx', ['--no-install', 'eslint', '--format', 'json', absFile], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  // exit code 2 = fatal config/parse error — skip gracefully
  if (result.status === 2 || result.error) return null
  try {
    const parsed = JSON.parse(result.stdout) as EslintFileResult[]
    const fileResult = parsed.find((r) => r.filePath === absFile)
    if (!fileResult) return []
    return fileResult.messages.map((m) => ({
      file: absFile,
      line: m.line,
      column: m.column,
      code: m.ruleId ?? 'eslint-parse-error',
      severity: m.severity === 2 ? 'error' : 'warning',
      message: m.message,
      source: 'eslint' as const,
    }))
  } catch {
    return null
  }
}

const findTsConfig = (start: string): string | null => {
  let dir = start
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'tsconfig.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export const runCheck = (opts: CheckOptions): CheckResult => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  const cwd = resolve(opts.cwd)
  const absFile = isAbsolute(opts.file) ? opts.file : resolve(cwd, opts.file)
  if (!existsSync(absFile)) {
    const err: CheckResult = {
      file: absFile,
      ok: false,
      errors: [
        {
          file: absFile,
          line: 0,
          column: 0,
          severity: 'error',
          code: 'CLI001',
          message: `File not found: ${absFile}`,
          source: 'tsc',
        },
      ],
      renderValidation: 'not-checked',
      lintValidation: 'skipped',
    }
    out(JSON.stringify(err, null, 2))
    return err
  }

  // Prefer the tsconfig closest to the target file (so monorepo packages
  // resolve their own paths), falling back to the cwd. If neither has a
  // tsconfig we let `tsc` use its defaults.
  const tsconfig = findTsConfig(dirname(absFile)) ?? findTsConfig(cwd)
  const tscCwd = tsconfig ? dirname(tsconfig) : cwd
  const args = ['--noEmit', '--pretty', 'false']
  if (tsconfig) args.push('--project', tsconfig)

  const result = spawnSync('npx', ['--no-install', 'tsc', ...args], {
    cwd: tscCwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const stdout = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const allErrors = parseTscOutput(stdout, tscCwd)
  const scoped = allErrors.filter((e) => e.file === absFile)

  const lintErrors = runEslint(absFile, cwd)
  const lintValidation: CheckResult['lintValidation'] =
    lintErrors === null
      ? 'skipped'
      : lintErrors.some((e) => e.severity === 'error')
        ? 'error'
        : 'ok'

  const allScoped = [...scoped, ...(lintErrors ?? [])]
  // ok = the *target file* compiles and passes lint. Errors elsewhere in the
  // project are not the page-scaffolding agent's problem.
  const ok = allScoped.filter((e) => e.severity === 'error').length === 0

  const final: CheckResult = {
    file: absFile,
    ok,
    errors: allScoped,
    renderValidation: 'not-checked',
    lintValidation,
  }

  out(JSON.stringify(final, null, 2))
  return final
}
