import { describe, expect, it } from 'vitest'
import { CONTAINER_TAB } from '@/constants/container-constants'
import {
  CONTAINER_MODEL_FAMILY,
  getSupportedContainerTabs,
  isAntspaceHydroContainer,
  isAntspaceImmersionContainer,
  isBitdeerContainer,
  isGammaContainer,
  isMicroBTContainer,
  isPduContainerTab,
  isWhatsminerContainer,
  resolveContainerModelFamily,
} from '../container-tabs'

describe('container model predicates', () => {
  it('detects Bitdeer via type fragment and model name', () => {
    expect(isBitdeerContainer('container-bd-d40-m56')).toBe(true)
    expect(isBitdeerContainer('bitdeer')).toBe(true)
    expect(isBitdeerContainer('container-mbt-alpha')).toBe(false)
    expect(isBitdeerContainer(undefined)).toBe(false)
  })

  it('detects Antspace hydro across its aliases', () => {
    expect(isAntspaceHydroContainer('container-as-hk3')).toBe(true)
    expect(isAntspaceHydroContainer('antspace-hydro')).toBe(true)
    expect(isAntspaceHydroContainer('bitmain-hydro')).toBe(true)
    expect(isAntspaceHydroContainer('container-as-immersion')).toBe(false)
  })

  it('detects Antspace immersion across its aliases', () => {
    expect(isAntspaceImmersionContainer('container-as-immersion')).toBe(true)
    expect(isAntspaceImmersionContainer('bitmain-immersion')).toBe(true)
    expect(isAntspaceImmersionContainer('bitmain-imm')).toBe(true)
    expect(isAntspaceImmersionContainer('container-as-hk3')).toBe(false)
  })

  it('detects MicroBT via type fragment and model name', () => {
    expect(isMicroBTContainer('container-mbt-alpha')).toBe(true)
    expect(isMicroBTContainer('microbt')).toBe(true)
    expect(isMicroBTContainer('container-bd-d40-m56')).toBe(false)
  })

  it('detects Gamma via m221 and model name', () => {
    expect(isGammaContainer('container-m221-gamma')).toBe(true)
    expect(isGammaContainer('m221')).toBe(true)
    expect(isGammaContainer('container-bd-d40-m56')).toBe(false)
  })

  it('detects Whatsminer containers by miner position type or MicroBT family', () => {
    expect(isWhatsminerContainer('container-bd-d40-m56')).toBe(true)
    expect(isWhatsminerContainer('container-bd-d40-m30')).toBe(true)
    expect(isWhatsminerContainer('container-mbt-alpha')).toBe(true)
    expect(isWhatsminerContainer('container-bd-d40-s19xp')).toBe(false)
    // Not a container type at all — miner types never match.
    expect(isWhatsminerContainer('miner-wm-m56s')).toBe(false)
  })
})

describe('resolveContainerModelFamily', () => {
  it('resolves each family from a real container type', () => {
    expect(resolveContainerModelFamily('container-bd-d40-m56')).toBe(
      CONTAINER_MODEL_FAMILY.BITDEER,
    )
    expect(resolveContainerModelFamily('container-as-hk3')).toBe(
      CONTAINER_MODEL_FAMILY.ANTSPACE_HYDRO,
    )
    expect(resolveContainerModelFamily('container-as-immersion')).toBe(
      CONTAINER_MODEL_FAMILY.ANTSPACE_IMMERSION,
    )
    expect(resolveContainerModelFamily('container-mbt-alpha')).toBe(
      CONTAINER_MODEL_FAMILY.MICROBT,
    )
    expect(resolveContainerModelFamily('container-m221-gamma')).toBe(
      CONTAINER_MODEL_FAMILY.GAMMA,
    )
  })

  it('returns undefined for unknown or missing types', () => {
    expect(resolveContainerModelFamily('container-unknown-x1')).toBeUndefined()
    expect(resolveContainerModelFamily(undefined)).toBeUndefined()
  })
})

describe('getSupportedContainerTabs', () => {
  it('Bitdeer S19XP (non-Whatsminer): base sequence without power adjustment', () => {
    expect(getSupportedContainerTabs('container-bd-d40-s19xp')).toEqual([
      CONTAINER_TAB.HOME,
      CONTAINER_TAB.PDU,
      CONTAINER_TAB.SETTINGS,
      CONTAINER_TAB.CHARTS,
      CONTAINER_TAB.HEATMAP,
    ])
  })

  it('Bitdeer M56 (Whatsminer miners): power adjustment spliced after PDU', () => {
    expect(getSupportedContainerTabs('container-bd-d40-m56')).toEqual([
      CONTAINER_TAB.HOME,
      CONTAINER_TAB.PDU,
      CONTAINER_TAB.POWER_ADJUSTMENT,
      CONTAINER_TAB.SETTINGS,
      CONTAINER_TAB.CHARTS,
      CONTAINER_TAB.HEATMAP,
    ])
  })

  it('Antspace hydro and immersion include the alarm tab', () => {
    const expected = [
      CONTAINER_TAB.HOME,
      CONTAINER_TAB.PDU,
      CONTAINER_TAB.ALARM,
      CONTAINER_TAB.SETTINGS,
      CONTAINER_TAB.CHARTS,
      CONTAINER_TAB.HEATMAP,
    ]
    expect(getSupportedContainerTabs('container-as-hk3')).toEqual(expected)
    expect(getSupportedContainerTabs('container-as-immersion')).toEqual(expected)
  })

  it('MicroBT: base sequence plus power adjustment after PDU', () => {
    expect(getSupportedContainerTabs('container-mbt-alpha')).toEqual([
      CONTAINER_TAB.HOME,
      CONTAINER_TAB.PDU,
      CONTAINER_TAB.POWER_ADJUSTMENT,
      CONTAINER_TAB.SETTINGS,
      CONTAINER_TAB.CHARTS,
      CONTAINER_TAB.HEATMAP,
    ])
  })

  it('Gamma: no heatmap, no power adjustment', () => {
    expect(getSupportedContainerTabs('container-m221-gamma')).toEqual([
      CONTAINER_TAB.HOME,
      CONTAINER_TAB.PDU,
      CONTAINER_TAB.SETTINGS,
      CONTAINER_TAB.CHARTS,
    ])
  })

  it('unknown type resolves to no tabs', () => {
    expect(getSupportedContainerTabs('container-unknown-x1')).toEqual([])
    expect(getSupportedContainerTabs(undefined)).toEqual([])
  })
})

describe('isPduContainerTab', () => {
  it('treats the pdu key as the PDU grid tab', () => {
    expect(isPduContainerTab(CONTAINER_TAB.PDU)).toBe(true)
    expect(isPduContainerTab(CONTAINER_TAB.CHARTS)).toBe(false)
    expect(isPduContainerTab(undefined)).toBe(false)
  })
})
