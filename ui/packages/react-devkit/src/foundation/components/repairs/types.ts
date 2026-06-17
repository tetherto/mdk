/**
 * Shape of a single inner repair action recorded inside a batch action.
 * `params[0]` holds the part-change payload the sub-row reads.
 */
export type RepairActionParam = Partial<{
  comment: string
  id: string
  rackId: string
  info: {
    parentDeviceId: string | null
  }
}>

/**
 * A single repair action within a batch. `params[0]` carries the part-change
 * payload.
 */
export type RepairAction = Partial<{
  params: RepairActionParam[]
}>

/**
 * A repair batch action. Its `params` are the individual repair actions
 * (part swaps, comments, etc.) grouped under one log entry.
 */
export type RepairBatchAction = Partial<{
  params: RepairAction[]
}>

/**
 * Minimal device record consumed by `RepairLogChangesSubRow`. The parent
 * fetches these (e.g. via the things API) and passes them in as props.
 */
export type RepairDevice = Partial<{
  id: string
  rack: string
  info: Partial<{
    serialNum: string
    macAddress: string
  }>
}>

/**
 * A single row rendered in the spare-part changes table.
 */
export type RepairLogChangeRow = {
  type: string
  serialNum?: string
  macAddress?: string
  removed: boolean
}
