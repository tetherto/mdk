import { describe, expect, it } from 'vitest'

import { buildMovementDetailsViewModel } from '../build-movement-details-view-model'
import type { MovementData } from '../movement-details-modal.types'

const baseMovement: MovementData = {
  origin: 'site.warehouse',
  destination: 'workshop.lab',
  previousStatus: 'ok_brand_new',
  newStatus: 'faulty',
  device: {
    code: 'M-1042',
    tags: ['code-M-1042'],
    type: 'antminer',
    info: {
      site: 'Site A',
      container: 'C-12',
      serialNum: 'SN-9981',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    },
  },
}

describe('buildMovementDetailsViewModel', () => {
  it('returns null when movement is undefined', () => {
    expect(buildMovementDetailsViewModel(undefined)).toBeNull()
  })

  it('resolves human-readable location labels', () => {
    const viewModel = buildMovementDetailsViewModel(baseMovement)
    expect(viewModel?.origin.locationLabel).toBe('Site Warehouse')
    expect(viewModel?.destination.locationLabel).toBe('Workshop Lab')
  })

  it('resolves human-readable status labels from the status key', () => {
    const viewModel = buildMovementDetailsViewModel(baseMovement)
    expect(viewModel?.origin.statusLabel).toBe('Brand New')
    expect(viewModel?.destination.statusLabel).toBe('Faulty')
  })

  it('falls back to the raw status key when unknown', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      newStatus: 'mystery_status',
    })
    expect(viewModel?.destination.statusLabel).toBe('mystery_status')
  })

  it('resolves badge colors for known location and status keys', () => {
    const viewModel = buildMovementDetailsViewModel(baseMovement)
    expect(viewModel?.origin.locationColors.borderColor).toBeTruthy()
    expect(viewModel?.origin.statusColors.borderColor).toBeTruthy()
  })

  it('uses fallback colors for unknown keys', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      origin: 'nowhere',
    })
    expect(viewModel?.origin.locationColors.backgroundColor).toBe('transparent')
  })

  it('builds the device summary with code and model', () => {
    const viewModel = buildMovementDetailsViewModel(baseMovement)
    expect(viewModel?.device?.code).toBe('M-1042')
    expect(viewModel?.device?.model).toBe('antminer')
  })

  it('prefers info.subType over type for the model', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      device: { ...baseMovement.device, info: { subType: 'psu' } },
    })
    expect(viewModel?.device?.model).toBe('psu')
  })

  it('falls through empty info.subType to type for the model', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      device: { ...baseMovement.device, type: 'antminer', info: { subType: '' } },
    })
    expect(viewModel?.device?.model).toBe('antminer')
  })

  it('renders a dash for empty-string attribute values', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      device: { code: 'X-1', tags: [], info: { site: '' } },
    })
    const site = viewModel?.device?.attributes.find((attribute) => attribute.label === 'Site')
    expect(site?.value).toBe('-')
  })

  it('maps device attributes with fallback dashes for missing values', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      device: { code: 'X-1', tags: [] },
    })
    const attributes = viewModel?.device?.attributes ?? []
    const site = attributes.find((attribute) => attribute.label === 'Site')
    expect(site?.value).toBe('-')
    expect(attributes.map((attribute) => attribute.label)).toEqual([
      'Site',
      'Container',
      'SN',
      'MAC',
    ])
  })

  it('carries comments through to the view model', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      comments: 'Moved for repair',
    })
    expect(viewModel?.comments).toBe('Moved for repair')
  })

  it('returns a null device when the device record is missing', () => {
    const viewModel = buildMovementDetailsViewModel({
      ...baseMovement,
      device: undefined,
    })
    expect(viewModel?.device).toBeNull()
  })
})
