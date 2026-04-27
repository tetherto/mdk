import _invert from 'lodash/invert'
import _map from 'lodash/map'
import _values from 'lodash/values'

export const MOVE_SPARE_PART = 'Move Spare Part'
export const INVENTORY_LOGS_ACTION = 'Inventory Logs'
export const DELETE_SPARE_PART = 'Delete Spare Part'
export const ADD_COMMENT_ACTION = 'Add Comment'

export const SPARE_PART_ACTIONS = {
  1: MOVE_SPARE_PART,
  2: INVENTORY_LOGS_ACTION,
  3: DELETE_SPARE_PART,
  4: ADD_COMMENT_ACTION,
}

export const FREE_SPARE_PART_ACTIONS = new Set([MOVE_SPARE_PART, DELETE_SPARE_PART])

export const SEARCHABLE_SPARE_PART_ATTRIBUTES = [
  'part',
  'type',
  'serialNum',
  'macAddress',
  'site',
  'location',
  'status',
  'dateUpdated',
  'parentDeviceSerialNum',
  'parentDeviceCode',
  'parentDeviceId',
  'code',
]

export const NO_PARENT_DEVICE_ID = 'Not Assigned'

export const SPARE_PART_LOCATIONS = {
  WORKSHOP_WAREHOUSE: 'workshop.warehouse',
  WORKSHOP_LAB: 'workshop.lab',
  SITE_WAREHOUSE: 'site.warehouse',
  SITE_LAB: 'site.lab',
  SITE_CONTAINER: 'site.container',
  DISPOSED: 'disposed',
  VENDOR: 'vendor',
  UNKNOWN: 'unknown',
}

export const SPARE_PART_LOCATION_BG_COLORS = {
  [SPARE_PART_LOCATIONS.SITE_WAREHOUSE]: '#22AFFF33',
  [SPARE_PART_LOCATIONS.SITE_LAB]: '#22AFFF33',
  [SPARE_PART_LOCATIONS.SITE_CONTAINER]: '#22AFFF33',
  [SPARE_PART_LOCATIONS.WORKSHOP_WAREHOUSE]: '#FFFF0033',
  [SPARE_PART_LOCATIONS.WORKSHOP_LAB]: '#FFFF0033',
  [SPARE_PART_LOCATIONS.DISPOSED]: '#FF3B3033',
  [SPARE_PART_LOCATIONS.UNKNOWN]: '#FF3B3033',
  [SPARE_PART_LOCATIONS.VENDOR]: '#00939333',
}

export const SPARE_PART_LOCATION_BORDER_COLORS = {
  [SPARE_PART_LOCATIONS.SITE_WAREHOUSE]: '#22AFFF',
  [SPARE_PART_LOCATIONS.SITE_LAB]: '#22AFFF',
  [SPARE_PART_LOCATIONS.SITE_CONTAINER]: '#22AFFF',
  [SPARE_PART_LOCATIONS.WORKSHOP_WAREHOUSE]: '#FFFF00',
  [SPARE_PART_LOCATIONS.WORKSHOP_LAB]: '#FFFF00',
  [SPARE_PART_LOCATIONS.DISPOSED]: '#FF3B30',
  [SPARE_PART_LOCATIONS.UNKNOWN]: '#FF3B30',
  [SPARE_PART_LOCATIONS.VENDOR]: '#009393',
}

export const SPARE_PART_STATUSES = {
  OK_BRAND_NEW: 'ok_brand_new',
  OK_RECOVERED: 'ok_recovered',
  OK_REPAIRED: 'ok_repaired',
  FAULTY: 'faulty',
  ON_HOLD: 'on_hold',
  SCRAPPED: 'scrapped',
  DISPOSED: 'disposed',
  UNKNOWN: 'unknown',
}

export const SPARE_PART_STATUS_NAMES = {
  [SPARE_PART_STATUSES.OK_BRAND_NEW]: 'Brand New',
  [SPARE_PART_STATUSES.OK_RECOVERED]: 'Recovered',
  [SPARE_PART_STATUSES.OK_REPAIRED]: 'Repaired',
  [SPARE_PART_STATUSES.FAULTY]: 'Faulty',
  [SPARE_PART_STATUSES.ON_HOLD]: 'On Hold',
  [SPARE_PART_STATUSES.SCRAPPED]: 'Scrapped',
  [SPARE_PART_STATUSES.DISPOSED]: 'Disposed',
  [SPARE_PART_STATUSES.UNKNOWN]: 'Unknown',
}

export const SPARE_PART_STATUS_BG_COLORS = {
  [SPARE_PART_STATUSES.OK_BRAND_NEW]: '#22AFFF33',
  [SPARE_PART_STATUSES.OK_RECOVERED]: '#34C75933',
  [SPARE_PART_STATUSES.OK_REPAIRED]: '#25904033',
  [SPARE_PART_STATUSES.FAULTY]: '#FF3B3033',
  [SPARE_PART_STATUSES.ON_HOLD]: '#F7931A33',
  [SPARE_PART_STATUSES.SCRAPPED]: '#FFFF0033',
  [SPARE_PART_STATUSES.DISPOSED]: '#98887333',
}

export const SPARE_PART_STATUS_BORDER_COLORS = {
  [SPARE_PART_STATUSES.OK_BRAND_NEW]: '#22AFFF',
  [SPARE_PART_STATUSES.OK_RECOVERED]: '#34C759',
  [SPARE_PART_STATUSES.OK_REPAIRED]: '#259040',
  [SPARE_PART_STATUSES.FAULTY]: '#FF3B30',
  [SPARE_PART_STATUSES.ON_HOLD]: '#F7931A',
  [SPARE_PART_STATUSES.SCRAPPED]: '#FFFF00',
  [SPARE_PART_STATUSES.DISPOSED]: '#988873',
}

export const SparePartTypes = {
  CONTROLLER: 'inventory-miner_part-controller',
  PSU: 'inventory-miner_part-psu',
  HASHBOARD: 'inventory-miner_part-hashboard',
}

export const SparePartNames = {
  [SparePartTypes.CONTROLLER]: 'Controller',
  [SparePartTypes.PSU]: 'PSU',
  [SparePartTypes.HASHBOARD]: 'Hashboard',
}

export const PART_ABBRV_MAPPING = {
  [SparePartTypes.CONTROLLER]: 'CB',
  [SparePartTypes.HASHBOARD]: 'HB',
}

export const SPARE_PARTS_LIST_TAB_ITEMS = _map(_values(SparePartTypes), (type: string) => ({
  key: type,
  label: (SparePartNames as Record<string, string>)[type] || type,
}))

export const CSV_PART_TYPES = {
  CONTROLLER: 'controller',
  PSU: 'psu',
  HASHBOARD: 'hashboard',
}

export const SPARE_PART_TYPE_TO_CSV_PART_TYPE = {
  [SparePartTypes.CONTROLLER]: CSV_PART_TYPES.CONTROLLER,
  [SparePartTypes.PSU]: CSV_PART_TYPES.PSU,
  [SparePartTypes.HASHBOARD]: CSV_PART_TYPES.HASHBOARD,
}

export const CSV_PART_TYPE_TO_SPARE_PART_TYPE = _invert(SPARE_PART_TYPE_TO_CSV_PART_TYPE)
