/**
 * Shared Vitest setup for the packages' DOM test environments. Each package lists it first in
 * its `setupFiles`.
 *
 * Node 25+ defines its own global `localStorage`, `undefined` unless Node runs with
 * `--localstorage-file`, and it shadows the test DOM's. Put the DOM's storage back: jsdom's
 * window's (its `Storage` cannot be constructed), or a new happy-dom `Storage`. In the `node`
 * environment there is no `Storage`, so this does nothing.
 */
if (typeof Storage !== 'undefined' && globalThis.localStorage === undefined) {
  Object.defineProperty(globalThis, 'localStorage', {
    value:
      (globalThis as { jsdom?: { window: Window } }).jsdom?.window.localStorage ?? new Storage(),
    configurable: true,
    writable: true,
  })
}
