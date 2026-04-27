export const POSITION_CHANGE_DIALOG_FLOWS = {
  CONFIRM_REMOVE: 'remove',
  CHANGE_INFO: 'changeInfo',
  MAINTENANCE: 'maintenance',
  REPLACE_MINER: 'replaceMiner',
  CONFIRM_CHANGE_POSITION: 'confirmChange',
  CONTAINER_SELECTION: 'containerSelection',
} as const

// Type exports
export type PositionChangeDialogFlowKey = keyof typeof POSITION_CHANGE_DIALOG_FLOWS
export type PositionChangeDialogFlowValue =
  (typeof POSITION_CHANGE_DIALOG_FLOWS)[PositionChangeDialogFlowKey]
