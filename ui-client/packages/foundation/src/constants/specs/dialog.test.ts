import { describe, expect, it } from 'vitest'
import { POSITION_CHANGE_DIALOG_FLOWS } from '../dialog'

describe('dialog constants', () => {
  it('should have position change dialog flows', () => {
    expect(POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_REMOVE).toBe('remove')
    expect(POSITION_CHANGE_DIALOG_FLOWS.CHANGE_INFO).toBe('changeInfo')
    expect(POSITION_CHANGE_DIALOG_FLOWS.MAINTENANCE).toBe('maintenance')
    expect(POSITION_CHANGE_DIALOG_FLOWS.REPLACE_MINER).toBe('replaceMiner')
    expect(POSITION_CHANGE_DIALOG_FLOWS.CONFIRM_CHANGE_POSITION).toBe('confirmChange')
    expect(POSITION_CHANGE_DIALOG_FLOWS.CONTAINER_SELECTION).toBe('containerSelection')
  })

  it('should have all dialog flow steps', () => {
    const flows = Object.values(POSITION_CHANGE_DIALOG_FLOWS)
    expect(flows).toHaveLength(6)
  })
})
