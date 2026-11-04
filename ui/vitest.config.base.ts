/**
 * Test settings every package's `vitest.config.js` shares.
 */

/**
 * Node arguments for the test workers. Node 25+ puts its own `localStorage` and
 * `sessionStorage` on the global, which read `undefined` without
 * `--localstorage-file` and shadow the DOM environment's, so every spec touching
 * storage fails. Turned off with the pre-25 flag name, since Node 24 rejects
 * `--no-webstorage` and would fail to start the workers at all.
 */
export const testExecArgv: string[] = ['--no-experimental-webstorage']
