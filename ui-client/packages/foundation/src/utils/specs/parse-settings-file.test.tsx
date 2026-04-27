import { describe, expect, it } from 'vitest'

import { parseSettingsFile } from '../settings-utils'

describe('parseSettingsFile', () => {
  it('resolves with parsed valid settings JSON', async () => {
    const settingsData = { timestamp: '2024-01-01', headerControls: {} }
    const fileContent = JSON.stringify(settingsData)
    const mockFile = new File([fileContent], 'settings.json', { type: 'application/json' })

    const result = await parseSettingsFile(mockFile)
    expect(result).toEqual(settingsData)
  })

  it('rejects with invalid JSON format error when file has bad structure', async () => {
    const fileContent = JSON.stringify({ unknownKey: true })
    const mockFile = new File([fileContent], 'settings.json', { type: 'application/json' })

    await expect(parseSettingsFile(mockFile)).rejects.toThrow('Invalid settings file format')
  })

  it('rejects with JSON parse error for malformed JSON', async () => {
    const mockFile = new File(['{ invalid json '], 'settings.json', { type: 'application/json' })

    await expect(parseSettingsFile(mockFile)).rejects.toThrow('Failed to parse JSON file')
  })

  it('rejects when FileReader encounters an error', async () => {
    const originalFileReader = globalThis.FileReader
    class MockFileReaderError {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      onerror: (() => void) | null = null
      readAsText() {
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }
    }
    globalThis.FileReader = MockFileReaderError as never

    const mockFile = new File(['test'], 'settings.json')
    await expect(parseSettingsFile(mockFile)).rejects.toThrow('Failed to read file')

    globalThis.FileReader = originalFileReader
  })
})
