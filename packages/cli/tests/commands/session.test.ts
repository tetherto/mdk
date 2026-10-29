import { Readable } from 'node:stream';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn(), whoami: vi.fn() }));
vi.mock('../../src/lib/session-kernel.js', () => lib);

const { registerSession } = await import('../../src/commands/session.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  program.option('-o, --output <fmt>', 'format', 'table');
  registerSession(program);
  return program.parseAsync(['node', 'mdk', ...args]);
}
function capture() {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { out: () => stdout.mock.calls.join(''), err: () => stderr.mock.calls.join('') };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const fn of Object.values(lib)) fn.mockReset();
  process.exitCode = undefined;
});

describe('mdk login / logout / whoami', () => {
  it('login reads the password from stdin and reports the session', async () => {
    const io = capture();
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(Readable.from(['correct horse battery\n']) as unknown as typeof process.stdin);
    lib.login.mockResolvedValue({ ok: true, username: 'ankit', expiresAt: Date.UTC(2026, 9, 28) });
    await run('login', 'ankit', '--password-stdin', '--dir', 'proj');
    expect(lib.login).toHaveBeenCalledWith('proj', 'ankit', 'correct horse battery');
    expect(io.out()).toMatch(/Signed in as ankit \(until 2026-10-28T00:00:00\.000Z\)/);

    lib.login.mockResolvedValue({ ok: false, message: 'ERR_IDENTITY_INVALID_CREDENTIALS' });
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(Readable.from(['x\n']) as unknown as typeof process.stdin);
    await run('login', 'ankit', '--password-stdin');
    expect(io.err()).toMatch(/ERR_IDENTITY_INVALID_CREDENTIALS/);
    expect(process.exitCode).toBe(1);
  });

  it('login without a terminal or stdin says how to pass the password', async () => {
    const io = capture();
    await run('login', 'ankit');
    expect(io.err()).toMatch(/--password-stdin/);
  });

  it('logout and whoami', async () => {
    const io = capture();
    lib.logout.mockResolvedValueOnce({ hadSession: false, revoked: false });
    await run('logout');
    lib.logout.mockResolvedValueOnce({ hadSession: true, revoked: true });
    await run('logout');
    lib.logout.mockResolvedValueOnce({ hadSession: true, revoked: false, message: 'Kernel down' });
    await run('logout');
    expect(io.out()).toMatch(/Not signed in\.[\s\S]*Signed out\n[\s\S]*Signed out here \(the Kernel was not told: Kernel down/);

    lib.whoami.mockReturnValueOnce({ as: 'serviceaccount', sub: 'mdk-cli' });
    await run('whoami');
    lib.whoami.mockReturnValueOnce({ as: 'user', sub: 'ankit', email: 'a@b.c', groups: ['ops'], sessionExpiresAt: 0 });
    await run('whoami');
    lib.whoami.mockReturnValue({ as: 'user', sub: 'ankit', sessionExpiresAt: 0 });
    await run('-o', 'json', 'whoami');
    await run('-o', 'yaml', 'whoami');
    const out = io.out();
    expect(out).toMatch(/mdk-cli \(service account; `mdk login` to act as a user\)/);
    expect(out).toMatch(/ankit <a@b\.c> \[ops\] until 1970/);
    expect(out).toContain('"as": "user"');
    expect(out).toContain('as: user');
  });
});
