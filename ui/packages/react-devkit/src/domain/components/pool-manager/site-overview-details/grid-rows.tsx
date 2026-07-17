import type React from 'react'

import { cn } from '@primitives'

import { isAntspaceHydro, isMicroBT } from '../../../utils/container-utils'
import { SITE_OVERVIEW_GRID_UNIT_COLORS } from '../pool-manager-constants'

import type { MinerData, Pdu, PduSocket } from './use-site-overview-details-data'
import {
  getMinerInSocket,
  getSocketStatus,
  getUnitRowLabel,
  socketHasMiner,
} from './site-overview-details-utils'

type GridSocketProps = {
  pdu: Pdu
  socket: PduSocket
  type?: string
  minersHashmap: Record<string, MinerData>
  disableMinerSelect?: boolean
  isSelected: boolean
  onSocketClick: (pdu: Pdu, socket: PduSocket) => void
}

const GridSocket = ({
  pdu,
  socket,
  type,
  minersHashmap,
  disableMinerSelect,
  isSelected,
  onSocketClick,
}: GridSocketProps) => {
  const miner = getMinerInSocket({ minersHashmap, pdu, socket })
  const isDisabled = !!(miner && !miner.error && disableMinerSelect)
  const hasMiner = socketHasMiner({ minersHashmap, pdu, socket })
  const gridColor = SITE_OVERVIEW_GRID_UNIT_COLORS[getSocketStatus({ minersHashmap, pdu, socket })]

  return (
    <div
      className={cn([
        'mdk-grid-unit__socket-wrapper',
        isDisabled && 'mdk-grid-unit__socket-wrapper--disabled',
      ])}
      data-socket={socket.socket}
      data-pdu-index={pdu.pdu}
      data-type={type}
    >
      <div
        className={cn([
          'mdk-grid-unit__socket-container',
          isDisabled && 'mdk-grid-unit__socket-container--disabled',
        ])}
        onClick={() => !isDisabled && onSocketClick(pdu, socket)}
      >
        <div
          className={cn([
            'mdk-grid-unit__miner-box',
            hasMiner && 'socket-container',
            hasMiner && 'mdk-grid-unit__miner-box--selectable',
            isSelected && 'mdk-grid-unit__miner-box--selected',
          ])}
          style={
            {
              '--mdk-grid-unit-color': gridColor,
              '--mdk-grid-unit-background-color': `${gridColor}1A`,
            } as React.CSSProperties
          }
          data-socket-index={socket.socket}
          data-pdu-index={pdu.pdu}
        >
          <div>{miner?.hashrate?.value}</div>
          <div>{miner?.hashrate?.unit}</div>
          <span className="mdk-grid-unit__miner-id">{socket.socket}</span>
        </div>
      </div>
    </div>
  )
}

export type GridRowsProps = {
  pdus: Pdu[]
  type?: string
  isHeatmapMode?: boolean
  isColumn: boolean
  minersHashmap: Record<string, MinerData>
  disableMinerSelect?: boolean
  selectedItems: Set<string>
  getSelectableName: (pdu: string, socket: string) => string
  onRowSelect: (pdu: Pdu, isDeselectKeyDown: boolean) => void
  onSocketClick: (pdu: Pdu, socket: PduSocket) => void
}

/**
 * Presentational rack grid: rows of PDUs, each a row label plus its sockets.
 * Pure render — selection state and click behaviour are owned by `GridUnit`
 * and passed in. Shared between the lazy pan/zoom viewer and its Suspense
 * fallback so the grid is identical whether or not the viewer chunk has loaded.
 */
export const GridRows = ({
  pdus,
  type,
  isHeatmapMode,
  isColumn,
  minersHashmap,
  disableMinerSelect,
  selectedItems,
  getSelectableName,
  onRowSelect,
  onSocketClick,
}: GridRowsProps) => (
  <div
    className={cn([
      'mdk-grid-unit__row-wrapper',
      `mdk-grid-unit__row-wrapper--${type ?? 'default'}`,
      isColumn && 'mdk-grid-unit__row-wrapper--column',
    ])}
  >
    {pdus.map((pdu, index) => (
      <div
        key={`row-${pdu.pdu}-${index}`}
        className={cn([
          'mdk-grid-unit__unit-row',
          'mdk-grid-unit__unit-row--rack',
          isHeatmapMode && 'mdk-grid-unit__unit-row--border',
        ])}
      >
        <div
          className={cn([
            'mdk-grid-unit__row-label',
            isHeatmapMode && 'mdk-grid-unit__row-label--heatmap',
          ])}
          onClick={(e: React.MouseEvent) => onRowSelect(pdu, !!(e.ctrlKey || e.metaKey))}
        >
          {getUnitRowLabel(pdu)}
        </div>

        <div
          className={cn([
            'mdk-grid-unit__sockets-list',
            `mdk-grid-unit__sockets-list--${type ?? 'default'}`,
            type && (isAntspaceHydro(type) || isMicroBT(type))
              ? 'mdk-grid-unit__sockets-list--column'
              : '',
            isHeatmapMode && 'mdk-grid-unit__sockets-list--heatmap',
          ])}
        >
          {pdu.sockets?.map((socket) => (
            <GridSocket
              key={socket.socket}
              pdu={pdu}
              socket={socket}
              type={type}
              minersHashmap={minersHashmap}
              disableMinerSelect={disableMinerSelect}
              isSelected={selectedItems.has(getSelectableName(pdu.pdu, String(socket.socket)))}
              onSocketClick={onSocketClick}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)
