/* eslint-disable style/indent */
/**
 * Async utilities
 *
 * Pure functions for working with asynchronous patterns.
 */

type CallbackFunction<T> = (
  ...args: [...unknown[], (err: Error | null, result?: T) => void]
) => void

/**
 * Convert a Node.js-style callback function to a Promise-based one
 *
 * @example
 * ```ts
 * const readFileAsync = promisify(fs.readFile)
 * const content = await readFileAsync('path/to/file')
 * ```
 */
export const promisify =
  <T>(fn: CallbackFunction<T>) =>
  (...args: unknown[]): Promise<T> =>
    new Promise((resolve, reject) => {
      ;(fn as (...a: unknown[]) => void)(...args, (err: Error | null, result?: T) => {
        if (err) {
          return reject(err)
        }
        resolve(result!)
      })
    })
