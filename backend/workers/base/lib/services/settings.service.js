'use strict'

class SettingsService {
  constructor ({ settingsDb }) {
    this.settingsDb = settingsDb
  }

  async getSettings () {
    const meta = await this.settingsDb.get('settings_00')
    return meta ? JSON.parse(meta.value) : {}
  }

  async saveSettingsEntries (entries) {
    if (!entries || typeof entries !== 'object') {
      throw new Error('ERR_ENTRIES_INVALID')
    }

    const existingSettings = await this.getSettings()
    const newSettings = { ...existingSettings, ...entries }
    await this.settingsDb.put('settings_00', JSON.stringify(newSettings))
    return newSettings
  }
}

module.exports = SettingsService
