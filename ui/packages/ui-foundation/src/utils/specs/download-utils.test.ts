// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { downloadCsv, downloadJson, downloadText, toCsv } from '../download-utils'

describe('toCsv', () => {
  it('writes a header from the first row, then one line per row', () => {
    expect(
      toCsv([
        { miner: 'a1', hashrate: 110 },
        { miner: 'a2', hashrate: 98.5 },
      ]),
    ).toBe('miner,hashrate\na1,110\na2,98.5')
  })

  it('takes, orders and filters the columns when given', () => {
    expect(toCsv([{ a: 1, b: 2, c: 3 }], ['c', 'a'])).toBe('c,a\n3,1')
  })

  it('quotes cells holding a comma, a quote or a line break', () => {
    expect(toCsv([{ note: 'a,b' }, { note: 'say "hi"' }, { note: 'two\nlines' }])).toBe(
      'note\n"a,b"\n"say ""hi"""\n"two\nlines"',
    )
  })

  it('leaves null and undefined cells empty', () => {
    expect(toCsv([{ a: null, b: undefined, c: 0 }])).toBe('a,b,c\n,,0')
  })

  it('is just a header line (or nothing) without rows', () => {
    expect(toCsv([], ['a', 'b'])).toBe('a,b')
    expect(toCsv([])).toBe('')
  })
})

describe('downloadCsv / downloadJson', () => {
  afterEach(() => vi.restoreAllMocks())

  const captureDownload = () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:x'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    return { blobs, click }
  }

  it('downloads CSV under the given name', async () => {
    const { blobs, click } = captureDownload()
    downloadCsv([{ a: 1 }], 'rows.csv')
    expect(click).toHaveBeenCalledOnce()
    expect(blobs[0]?.type).toBe('text/csv')
    expect(await blobs[0]?.text()).toBe('a\n1')
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('rows.csv')
  })

  it('downloads text, content first like the others', async () => {
    const { blobs, click } = captureDownload()
    downloadText('hello', 'note.txt')
    expect(await blobs[0]?.text()).toBe('hello')
    expect(blobs[0]?.type).toBe('text/plain')
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('note.txt')
  })

  it('downloads pretty-printed JSON', async () => {
    const { blobs } = captureDownload()
    downloadJson({ a: 1 })
    expect(blobs[0]?.type).toBe('application/json')
    expect(await blobs[0]?.text()).toBe('{\n  "a": 1\n}')
  })
})
