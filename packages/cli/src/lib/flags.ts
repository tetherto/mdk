let showStacks = false;

/** Applies the global `-v` and `--debug` flags before a command runs. */
export function applyGlobalFlags(opts: { verbose?: boolean; debug?: boolean }): void {
  showStacks = Boolean(opts.debug);
  // Every MDK component logs through the `debug` package under mdk:*; a DEBUG the user set wins.
  // `debug` reads DEBUG once, when it is first loaded, so this only works because the CLI requires the
  // MDK packages lazily, inside functions: a static import of one that loads `debug` would silently break -v.
  if (opts.verbose && process.env.DEBUG === undefined) process.env.DEBUG = 'mdk:*';
}

/**
 * What an unexpected failure the user sees prints: its message, or its stack trace with `--debug`.
 * An error folded into a report or a result keeps just its message: `message()` in app-package.ts and kernel-client.ts.
 */
export function failureText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return showStacks && error.stack ? error.stack : error.message;
}
