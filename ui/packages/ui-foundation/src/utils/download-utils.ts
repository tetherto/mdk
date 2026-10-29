/**
 * File downloads from the browser: CSV and JSON exports of data a page is
 * showing. `toCsv` is pure; the `download*` helpers need a DOM.
 */

/** A CSV cell value. `null` and `undefined` become an empty cell. */
export type CsvValue = string | number | boolean | null | undefined

/**
 * One cell, quoted when it holds a comma, a quote or a line break (RFC 4180).
 */
const csvCell = (value: CsvValue): string => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * Rows of objects as CSV text. Columns are `columns` when given (which also
 * orders and filters them), else the keys of the first row; a header line
 * names them.
 *
 * @example
 * ```ts
 * toCsv([{ miner: 'a1', hashrate: 110 }]) // "miner,hashrate\na1,110"
 * toCsv(rows, ['ts', 'power_w'])            // only those columns, in that order
 * ```
 *
 * @category utils
 */
export const toCsv = <Row extends Record<string, CsvValue>>(
  rows: readonly Row[],
  columns: readonly (keyof Row & string)[] = Object.keys(rows[0] ?? {}) as (keyof Row & string)[],
): string =>
  [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n')

/**
 * Saves `text` as a file named `filename` through the browser's download. Like
 * `downloadCsv` and `downloadJson`, it takes the content first.
 *
 * @category utils
 */
export const downloadText = (text: string, filename = 'export.txt', type = 'text/plain'): void => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Downloads rows of objects as a CSV file (see {@link toCsv} for the columns).
 *
 * @category utils
 */
export const downloadCsv = <Row extends Record<string, CsvValue>>(
  rows: readonly Row[],
  filename = 'export.csv',
  columns?: readonly (keyof Row & string)[],
): void => downloadText(toCsv(rows, columns), filename, 'text/csv')

/**
 * Downloads `data` as a pretty-printed JSON file.
 *
 * @category utils
 */
export const downloadJson = (data: unknown, filename = 'export.json'): void =>
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json')
