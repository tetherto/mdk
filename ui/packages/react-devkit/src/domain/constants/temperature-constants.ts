export const HEATMAP_MODE = {
  PCB: 'pcb',
  CHIP: 'chip',
  INLET: 'inlet',
  HASHRATE: 'hashrate',
} as const

// Type exports
export type HeatmapModeKey = keyof typeof HEATMAP_MODE
export type HeatmapModeValue = (typeof HEATMAP_MODE)[HeatmapModeKey]
