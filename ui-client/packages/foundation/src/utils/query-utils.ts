import type { UnknownRecord } from '@tetherto/core'
import { MAINTENANCE_CONTAINER, NO_MAINTENANCE_CONTAINER } from '../constants/container-constants'

const THING_SEARCH_ATTRIBUTES = [
  'type',
  'info.site',
  'info.container',
  'info.pos',
  'info.serialNum',
  'info.serialNumber',
  'info.address',
  'info.macAddress',
  'info.location',
  'info.status',
  'id',
  'code',
]

const INVENTORY_SEARCH_ATTRIBUTES = [
  ...THING_SEARCH_ATTRIBUTES,
  'info.parentDeviceSN',
  'info.parentDeviceCode',
  'info.parentDeviceId',
  'info.parentDeviceModel',
  'info.parentDeviceType',
  'info.subType',
]

const attributeRegexp = /^(ip|mac|sn|firmware)-/
export const CONTAINER_LIST_THINGS_LIMIT = 1000

type FilterAttribute = {
  attribute: string
  values: (string | boolean)[]
}

type PartitionedTags = {
  tags: string[]
  ip: string[]
  mac: string[]
  sn: string[]
  firmware: string[]
}

export const getByThingsAttributeQuery = (
  filterAttributes: FilterAttribute[],
  selectedTypes: string[],
  allowEmptyArray?: boolean,
): UnknownRecord => {
  if (filterAttributes.length === 0 && !allowEmptyArray) return {}

  const query = filterAttributes.map((filterAttribute) => {
    if (filterAttribute.attribute === 'last.alerts') {
      if (filterAttribute.values[0]) {
        return { [`${filterAttribute.attribute}.0`]: { $exists: true } }
      }
      if (filterAttribute.values[0] === false) {
        return { [`${filterAttribute.attribute}.0`]: { $exists: false } }
      }
      return {}
    }

    if (filterAttribute.attribute === 'info.container') {
      if ((filterAttribute.values?.length ?? 0) > 1) return {}
      if (filterAttribute.values[0] === NO_MAINTENANCE_CONTAINER) {
        return { [filterAttribute.attribute]: { $ne: MAINTENANCE_CONTAINER } }
      }
    }

    if (filterAttribute.attribute === 'info.macAddress') {
      const macAddresses = filterAttribute.values as string[]
      const macRegexQuery = macAddresses.map((mac) => ({
        'info.macAddress': { $regex: `^${mac}$`, $options: 'i' },
      }))
      return { $or: macRegexQuery }
    }

    if (filterAttribute.attribute === 'tags') {
      const searchAttributes = [
        ...(selectedTypes.includes('t-miner') ||
        selectedTypes.includes('t-container') ||
        selectedTypes.includes('t-powermeter') ||
        selectedTypes.includes('t-sensor')
          ? THING_SEARCH_ATTRIBUTES
          : []),
        ...(selectedTypes.includes('t-inventory-miner_part') ? INVENTORY_SEARCH_ATTRIBUTES : []),
      ]

      const allAttributesRegexQuery = (filterAttribute.values ?? []).flatMap((value) =>
        searchAttributes.map((attribute) => ({
          [attribute]: { $regex: `${value}`, $options: 'i' },
        })),
      )

      return {
        $or: [
          ...allAttributesRegexQuery,
          { [filterAttribute.attribute]: { $in: filterAttribute.values } },
        ],
      }
    }

    return { [filterAttribute.attribute]: { $in: filterAttribute.values } }
  })

  return { $and: query }
}

const partitionTagsIntoTagsAndAttributes = (filterTags: string[] = []): PartitionedTags =>
  filterTags.reduce<PartitionedTags>(
    (groupedArrays, tag) => {
      const key = tag.match(attributeRegexp)?.[1]
      if (key) {
        groupedArrays[key as keyof Omit<PartitionedTags, 'tags'>].push(
          tag.replace(attributeRegexp, ''),
        )
      } else {
        groupedArrays.tags.push(tag)
      }
      return groupedArrays
    },
    { tags: [], ip: [], mac: [], sn: [], firmware: [] },
  )

export const getListQuery = (
  filterTags: string[],
  filters?: Record<string, string[]>,
  selectedTypes: string[] = ['t-container'],
): string => {
  const partitionedTags = partitionTagsIntoTagsAndAttributes(filterTags)
  const queryArray: FilterAttribute[] = []

  if (filters && Object.keys(filters).length > 0) {
    Object.keys(filters).forEach((attribute) => {
      queryArray.push({ attribute, values: filters[attribute] as string[] })
    })
  }

  if (partitionedTags.ip.length > 0) {
    queryArray.push({ attribute: 'opts.address', values: partitionedTags.ip })
  }

  if (partitionedTags.mac.length > 0) {
    queryArray.push({
      attribute: 'info.macAddress',
      values: partitionedTags.mac.map((address) => address.toLowerCase()),
    })
  }

  if (partitionedTags.sn.length > 0) {
    queryArray.push({ attribute: 'info.serialNum', values: partitionedTags.sn })
  }

  if (partitionedTags.firmware.length > 0) {
    queryArray.push({
      attribute: 'last.snap.config.firmware_ver',
      values: partitionedTags.firmware,
    })
  }

  if (partitionedTags.tags.length > 0) {
    queryArray.push({ attribute: 'tags', values: partitionedTags.tags })
  }

  return JSON.stringify({
    $and: [getByThingsAttributeQuery(queryArray, selectedTypes), { tags: { $in: selectedTypes } }],
  })
}

export const getFiltersQuery = (
  filterTags?: string[],
  filters?: Record<string, string[]>,
  selectedTypes: string[] = ['t-container'],
): UnknownRecord => {
  const query = JSON.parse(getListQuery(filterTags ?? [], filters, selectedTypes))
  return query ?? {}
}

export const getByTagsQuery = (filterTags: string[], allowEmptyArray?: boolean): string => {
  if (filterTags.length === 0 && !allowEmptyArray) return '{}'
  return JSON.stringify({ tags: { $in: filterTags } })
}

export const getByTagsWithAlertsQuery = (
  filterTags: string[],
  allowEmptyArray?: boolean,
): string => {
  const hasTags = filterTags.length > 0

  let query: UnknownRecord = {
    'last.alerts': { $ne: null },
  }

  if (hasTags || allowEmptyArray) {
    query = {
      $or: [query, { 'last.alerts.name': { $in: filterTags } }, getFiltersQuery(filterTags)],
    }
  }

  return JSON.stringify(query)
}

export const getByTagsWithCriticalAlertsQuery = (
  filterTags: string[],
  allowEmptyArray?: boolean,
): string => {
  if (filterTags.length === 0 && !allowEmptyArray) {
    return JSON.stringify({
      'last.alerts': { $elemMatch: { severity: 'critical' } },
    })
  }

  return JSON.stringify({
    tags: { $in: filterTags },
    'last.alerts': { $elemMatch: { severity: 'critical' } },
  })
}

export const getByTypesQuery = (filterTypes: string[], allowEmptyArray?: boolean): string => {
  if (filterTypes.length === 0 && !allowEmptyArray) return '{}'
  return JSON.stringify({ type: { $in: filterTypes } })
}

export const getByIdsQuery = (ids: string[], allowEmptyArray?: boolean): string => {
  if (ids.length === 0 && !allowEmptyArray) return '{}'
  return JSON.stringify({ id: { $in: ids } })
}

export const getContainerByContainerTagsQuery = (
  filterTags: string[],
  allowEmptyArray?: boolean,
): string => {
  if (filterTags.length === 0 && !allowEmptyArray) return '{}'
  return JSON.stringify({
    $and: [{ tags: { $in: filterTags } }, { tags: { $in: ['t-container'] } }],
  })
}

export const getMinersByContainerTagsQuery = (
  filterTags: string[],
  allowEmptyArray?: boolean,
): string => {
  if (filterTags.length === 0 && !allowEmptyArray) return ''
  return JSON.stringify({
    $and: [{ tags: { $in: filterTags } }, { tags: { $in: ['t-miner'] } }],
  })
}

export const getSitePowerMeterQuery = (): string =>
  JSON.stringify({
    $and: [{ 'info.pos': { $eq: 'site' } }, { tags: { $in: ['t-powermeter'] } }],
  })

export const getLvCabinetDevicesByRoot = (root: string): string =>
  JSON.stringify({
    $and: [
      { 'info.pos': { $regex: `${root}` } },
      { tags: { $in: ['t-powermeter', 't-sensor-temp'] } },
    ],
  })

export const getDeviceByAlertId = (uuid: string): string =>
  JSON.stringify({
    'last.alerts': { $elemMatch: { uuid: `${uuid}` } },
  })

export const getContainerMinersByContainerTagsQuery = (
  filterTags: string[],
  allowEmptyArray?: boolean,
): string => {
  if (filterTags.length === 0 && !allowEmptyArray) return '{}'
  return JSON.stringify({
    $and: [{ tags: { $in: filterTags } }, { tags: { $in: ['t-miner'] } }],
  })
}
