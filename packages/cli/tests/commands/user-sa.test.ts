import { Readable } from 'node:stream';
import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({
  addUser: vi.fn(),
  setPassword: vi.fn(),
  setDisabled: vi.fn(),
  listUsers: vi.fn(),
  removeUser: vi.fn(),
  addAgent: vi.fn(),
  rotateAccount: vi.fn(),
  removeAgent: vi.fn(),
  listAccounts: vi.fn(),
  serviceAccountToken: vi.fn(),
}));
vi.mock('../../src/lib/identity-kernel.js', () => lib);
const prompts = vi.hoisted(() => ({ answers: [] as unknown[] }));
vi.mock('@clack/prompts', () => ({
  isCancel: (v: unknown) => v === Symbol.for('cancel'),
  password: vi.fn(async () => prompts.answers.shift()),
}));

const { registerUser, readPassword } = await import('../../src/commands/user.js');
const { registerSa } = await import('../../src/commands/sa.js');

function run(...args: string[]): Promise<Command> {
  const program = new Command();
  program.exitOverride();
  program.option('-o, --output <fmt>', 'format', 'table');
  registerUser(program);
  registerSa(program);
  return program.parseAsync(['node', 'mdk', ...args]);
}

function capture() {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return { out: () => stdout.mock.calls.join(''), err: () => stderr.mock.calls.join('') };
}

/** The test runner's stdin is no terminal; pretend it is for the prompt path. */
const tty = () => Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

afterEach(() => {
  delete (process.stdin as { isTTY?: boolean }).isTTY;
  vi.restoreAllMocks();
  for (const fn of Object.values(lib)) fn.mockReset();
  prompts.answers = [];
  process.exitCode = undefined;
});

const USER = { name: 'ankit', groups: ['ops'], disabled: false, hasPassword: true, createdAt: 't', updatedAt: 't' };

describe('readPassword', () => {
  it('reads stdin without its trailing newline', async () => {
    expect(await readPassword(true, Readable.from(['correct horse ', 'battery\n']))).toBe('correct horse battery');
  });

  it('prompts twice on a terminal, and refuses mismatches, cancels and no terminal', async () => {
    prompts.answers = ['pw-one-is-long', 'pw-one-is-long'];
    expect(await readPassword(false, process.stdin, true)).toBe('pw-one-is-long');
    prompts.answers = ['a-long-password', 'b-long-password'];
    await expect(readPassword(false, process.stdin, true)).rejects.toThrow(/do not match/);
    prompts.answers = [Symbol.for('cancel')];
    await expect(readPassword(false, process.stdin, true)).rejects.toThrow(/Cancelled/);
    prompts.answers = ['x', Symbol.for('cancel')];
    await expect(readPassword(false, process.stdin, true)).rejects.toThrow(/Cancelled/);
    await expect(readPassword(false, process.stdin, false)).rejects.toThrow(/--password-stdin/);
  });
});

describe('mdk user', () => {
  it('add --admin reports the role, the binding and the policy in force', async () => {
    const io = capture();
    prompts.answers = ['correct horse battery', 'correct horse battery'];
    tty();
    lib.addUser.mockResolvedValue({ ok: true, value: { created: true, user: USER, binding: { roleCreated: true, bound: true }, applied: { ok: true, local: { version: 'v1' } } } });
    await run('user', 'add', 'ankit', '--admin', '--group', 'ops', '--group', 'sre', '--email', 'a@b.c', '--dir', 'proj');
    expect(lib.addUser).toHaveBeenCalledWith('proj', { name: 'ankit', email: 'a@b.c', groups: ['ops', 'sre'], password: 'correct horse battery', admin: true });
    expect(io.out()).toMatch(/Created user ankit[\s\S]*added role admin[\s\S]*bound ankit to admin[\s\S]*enforces v1/);
    expect(process.exitCode).toBeUndefined();
  });

  it('add --no-password sends none; an update says Updated; a failure exits 1 with its errors', async () => {
    const io = capture();
    lib.addUser.mockResolvedValueOnce({ ok: true, value: { created: false, user: USER, binding: { roleCreated: false, bound: false } } });
    await run('user', 'add', 'ankit', '--no-password', '--admin');
    expect(lib.addUser.mock.calls[0][1].password).toBeUndefined();
    expect(io.out()).toMatch(/Updated user ankit[\s\S]*already bound/);

    lib.addUser.mockResolvedValueOnce({ ok: false, message: 'the Kernel refused', errors: ['e1'] });
    await run('user', 'add', 'x', '--no-password');
    expect(io.err()).toMatch(/the Kernel refused\n {2}e1/);
    expect(process.exitCode).toBe(1);
  });

  it('turns a thrown error (a weak password) into exit 1', async () => {
    const io = capture();
    lib.setPassword.mockImplementation(() => { throw new Error('ERR_IDENTITY_PASSWORD_WEAK: a password needs at least 12 characters'); });
    tty();
    prompts.answers = ['short', 'short'];
    await run('user', 'passwd', 'ankit');
    expect(io.err()).toMatch(/ERR_IDENTITY_PASSWORD_WEAK/);
    expect(process.exitCode).toBe(1);
  });

  it('passwd, disable, enable and remove', async () => {
    const io = capture();
    lib.setPassword.mockResolvedValue({ ok: true, value: { created: false, user: USER } });
    tty();
    prompts.answers = ['correct horse battery', 'correct horse battery'];
    await run('user', 'passwd', 'ankit');
    expect(io.out()).toMatch(/Password set for ankit/);

    lib.setDisabled.mockResolvedValue({ ok: true, value: { created: false, user: USER } });
    await run('user', 'disable', 'ankit');
    await run('user', 'enable', 'ankit');
    expect(lib.setDisabled.mock.calls.map((c) => c[2])).toEqual([true, false]);
    expect(io.out()).toMatch(/Disabled ankit[\s\S]*Enabled ankit/);

    lib.removeUser.mockResolvedValueOnce({ ok: true, value: { deleted: true } });
    await run('user', 'remove', 'ankit');
    expect(io.out()).toMatch(/Removed user ankit/);
    lib.removeUser.mockResolvedValueOnce({ ok: true, value: { deleted: false } });
    await run('user', 'remove', 'ghost');
    expect(io.err()).toMatch(/No user named "ghost"/);
    lib.removeUser.mockResolvedValueOnce({ ok: false, message: 'down' });
    await run('user', 'remove', 'x');
    expect(io.err()).toMatch(/error: down/);
  });

  it('lists users as a table, json or yaml', async () => {
    const io = capture();
    lib.listUsers.mockResolvedValue({ ok: true, value: { users: [USER, { ...USER, name: 'off', email: 'o@b.c', groups: [], disabled: true, hasPassword: false }] } });
    await run('user', 'list');
    expect(io.out()).toMatch(/ankit .*\[ops\]/);
    expect(io.out()).toMatch(/off <o@b\.c>.*disabled.*no password/);
    await run('-o', 'json', 'user', 'list');
    expect(io.out()).toContain('"hasPassword": true');
    await run('-o', 'yaml', 'user', 'list');
    expect(io.out()).toContain('hasPassword: true');
    lib.listUsers.mockResolvedValue({ ok: true, value: { users: [] } });
    await run('user', 'list');
    expect(io.out()).toMatch(/No users\. Create the first with mdk user add <name> --admin/);
    lib.listUsers.mockResolvedValue({ ok: false, message: 'down' });
    await run('user', 'list');
    expect(process.exitCode).toBe(1);
  });
});

describe('mdk sa', () => {
  const credential = { name: 'operator-agent', kind: 'agent', publicKey: 'ab', createdAt: 't', file: '/p/.mdk/credentials/agents/operator-agent.json' };

  it('add shows the credential file, the registration and how to bind it', async () => {
    const io = capture();
    lib.addAgent.mockResolvedValueOnce({ credential, registered: true });
    await run('sa', 'add', 'operator-agent');
    expect(io.out()).toMatch(/Created service account operator-agent[\s\S]*agents\/operator-agent\.json[\s\S]*registered[\s\S]*kind: ServiceAccount, name: operator-agent/);
    lib.addAgent.mockResolvedValueOnce({ credential, registered: false, message: 'Kernel down; it is registered when the Kernel next starts' });
    await run('sa', 'add', 'operator-agent');
    expect(io.out()).toMatch(/note.*next starts/);
    lib.addAgent.mockRejectedValueOnce(new Error('already has a credential'));
    await run('sa', 'add', 'operator-agent');
    expect(io.err()).toMatch(/already has a credential/);
    expect(process.exitCode).toBe(1);
  });

  it('rotate and remove', async () => {
    const io = capture();
    lib.rotateAccount.mockResolvedValue({ credential, registered: true });
    await run('sa', 'rotate', 'app:ops-center');
    expect(io.out()).toMatch(/Rotated app:ops-center/);
    lib.removeAgent.mockResolvedValueOnce({ removed: true, credential: null, registered: true });
    await run('sa', 'remove', 'operator-agent');
    expect(io.out()).toMatch(/Removed operator-agent/);
    lib.removeAgent.mockResolvedValueOnce({ removed: false, credential: null, registered: false, message: 'down' });
    await run('sa', 'remove', 'ghost');
    expect(io.err()).toMatch(/No service account named "ghost"/);
  });

  it('lists accounts with their state', async () => {
    const io = capture();
    lib.listAccounts.mockResolvedValueOnce({
      kernel: 'up',
      rows: [
        { name: 'app:ops-center', kind: 'app', local: true, registered: true, stale: false },
        { name: 'operator-agent', kind: 'agent', local: true, registered: true, stale: true },
        { name: 'new-agent', kind: 'agent', local: true, registered: false, stale: false },
        { name: 'orphan', kind: 'agent', local: false, registered: true, stale: false },
      ],
    });
    await run('sa', 'list');
    const out = io.out();
    expect(out).toMatch(/app:ops-center .*local .*registered/);
    expect(out).toMatch(/key differs; restart or rotate/);
    expect(out).toMatch(/new-agent .*not registered/);
    expect(out).toMatch(/orphan .*no local credential/);

    lib.listAccounts.mockResolvedValueOnce({ kernel: 'down', rows: [], message: 'no Kernel key' });
    await run('sa', 'list');
    expect(io.out()).toMatch(/No service accounts\.[\s\S]*kernel down: no Kernel key/);
    lib.listAccounts.mockResolvedValue({ kernel: 'up', rows: [] });
    await run('-o', 'json', 'sa', 'list');
    expect(io.out()).toContain('"kernel": "up"');
    await run('-o', 'yaml', 'sa', 'list');
    expect(io.out()).toContain('kernel: up');
  });

  it('token prints the access token alone, or everything as json', async () => {
    const io = capture();
    lib.serviceAccountToken.mockResolvedValue({ ok: true, value: { accessToken: 'tok', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 1 } });
    await run('sa', 'token', 'operator-agent', '--dir', 'proj');
    expect(lib.serviceAccountToken).toHaveBeenCalledWith('proj', 'operator-agent');
    expect(io.out()).toBe('tok\n')
    expect(io.err()).toMatch(/expires in 600s/);
    await run('-o', 'json', 'sa', 'token', 'operator-agent');
    expect(io.out()).toContain('"refreshToken": "r"');
    await run('-o', 'yaml', 'sa', 'token', 'operator-agent');
    expect(io.out()).toContain('refreshToken: r');
    lib.serviceAccountToken.mockResolvedValue({ ok: false, message: 'no credential' });
    await run('sa', 'token', 'ghost');
    expect(io.err()).toMatch(/no credential/);
    expect(process.exitCode).toBe(1);
  });
});
