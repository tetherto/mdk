import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import type React from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

import { Button, cn, SimpleTooltip } from '@core'

import { isAntspaceHydro, isMicroBT } from '../../../utils/container-utils'
import { SITE_OVERVIEW_GRID_UNIT_COLORS } from '../pool-manager-constants'

import {
  getControlSectionsTooltips,
  useDeviceResolution,
  useKeyDown,
  usePduViewer,
  usePlatform,
} from '@tetherto/mdk-react-adapter'

import type { ContainerInfo } from '../../../types'
import type { MinerData, Pdu, PduSocket } from './use-site-overview-details-data'
import './grid-unit.scss'
import {
  getMinerInSocket,
  getSocketStatus,
  getUnitRowLabel,
  socketHasMiner,
} from './site-overview-details-utils'

export type GridUnitProps = {
  containerInfo: ContainerInfo
  connectedMiners?: Partial<ContainerInfo[]>
  isHeatmapMode?: boolean
  type?: string
  onSocketClick?: (
    containerInfo: ContainerInfo,
    pduIndex: number | string,
    socketIndex: number | string,
    miner?: MinerData,
  ) => void
  disableMinerSelect?: boolean
  selectedItems: Set<string>
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>
  sectionKey: string
  mobileSelectionEnabled?: boolean
  segregatedPduSections: Record<string, Pdu[]>
  minersHashmap: Record<string, MinerData>
  getSelectableName: (pdu: string, socket: string) => string
}

export const GridUnit = ({
  containerInfo,
  connectedMiners = [],
  isHeatmapMode,
  type,
  onSocketClick = () => {},
  disableMinerSelect,
  selectedItems,
  setSelectedItems,
  sectionKey,
  mobileSelectionEnabled,
  segregatedPduSections,
  minersHashmap,
  getSelectableName,
}: GridUnitProps) => {
  const isAltDown = useKeyDown('Alt')

  const {
    viewportBoundingBox,
    showBackToContent,
    showViewerControls,
    minZoomLevel,
    onViewerInit,
    resetViewer,
    handleBackToContent,
    handleZoomIn,
    handleZoomOut,
    checkShowBackToContent,
  } = usePduViewer()

  const { isTablet } = useDeviceResolution()
  const platform = usePlatform()
  const toolTips = getControlSectionsTooltips(platform)

  const handleUnitRowSelect = (pdu: Pdu, isDeselectKeyDown: boolean) => {
    setSelectedItems((existing) => {
      const next = new Set([...existing])
      for (const socket of pdu?.sockets ?? []) {
        const name = getSelectableName(pdu.pdu, String(socket.socket))
        if (isDeselectKeyDown) {
          next.delete(name)
        } else {
          next.add(name)
        }
      }
      return next
    })
  }

  const getIsClickDisabled = (pdu: Pdu, socket: PduSocket): boolean => {
    const miner = getMinerInSocket({ minersHashmap, pdu, socket })
    return !!(miner && !miner.error && disableMinerSelect)
  }

  const onSocketClickHandler = (pdu: Pdu, socket: PduSocket) => {
    onSocketClick(
      { ...containerInfo, rack: connectedMiners[0]?.rack },
      pdu.pdu,
      socket.socket,
      getMinerInSocket({ minersHashmap, pdu, socket }),
    )
  }

  const isSelected = (pdu: Pdu, socket: PduSocket): boolean =>
    selectedItems.has(getSelectableName(pdu.pdu, String(socket.socket)))

  const isColumn = type ? !isAntspaceHydro(type) && !isMicroBT(type) : false

  return (
    <div className="mdk-grid-unit" onContextMenu={(e: React.MouseEvent) => e.preventDefault()}>
      {showViewerControls && (
        <div className="mdk-grid-unit__controls">
          <span className="mdk-grid-unit__controls-title">Racks</span>

          <div className="mdk-grid-unit__controls-section mdk-grid-unit__controls-section--expand">
            <Button size="sm" onClick={handleZoomIn}>
              Zoom in
            </Button>
            <Button size="sm" onClick={handleZoomOut}>
              Zoom out
            </Button>
            <Button size="sm" onClick={() => resetViewer(viewportBoundingBox)}>
              Reset
            </Button>
            {showBackToContent && (
              <Button size="sm" variant="primary" onClick={handleBackToContent}>
                Back to content
              </Button>
            )}
          </div>

          {!isTablet && (
            <div className="mdk-grid-unit__controls-section">
              <SimpleTooltip
                content={
                  <ul className="mdk-grid-unit__tooltip-list">
                    {toolTips.map((tip, idx) => (
                      <li key={idx}>
                        <strong>{tip.label}</strong>: {tip.desc}
                      </li>
                    ))}
                  </ul>
                }
              >
                <span className="mdk-grid-unit__tooltip-trigger">
                  <QuestionMarkCircledIcon />
                </span>
              </SimpleTooltip>
            </div>
          )}
        </div>
      )}

      <TransformWrapper
        onInit={onViewerInit}
        disabled={false}
        wheel={{ disabled: true }}
        panning={{
          disabled: mobileSelectionEnabled && !isAltDown,
          activationKeys: isAltDown ? [] : ['impossible-key'],
        }}
        doubleClick={{ disabled: true }}
        minScale={minZoomLevel}
        maxScale={1.5}
        onPanning={checkShowBackToContent}
        onZoom={checkShowBackToContent}
        onPinch={checkShowBackToContent}
      >
        <TransformComponent
          wrapperClass="mdk-grid-unit__viewer-wrapper"
          contentClass="mdk-grid-unit__viewer-content"
        >
          <div
            className={cn([
              'mdk-grid-unit__row-wrapper',
              `mdk-grid-unit__row-wrapper--${type ?? 'default'}`,
              isColumn && 'mdk-grid-unit__row-wrapper--column',
            ])}
          >
            {(segregatedPduSections[sectionKey] ?? []).map((pdu, index) => (
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
                  onClick={(e: React.MouseEvent) =>
                    handleUnitRowSelect(pdu, !!(e.ctrlKey || e.metaKey))
                  }
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
                  {pdu.sockets?.map((socket) => {
                    const isDisabled = getIsClickDisabled(pdu, socket)
                    const hasMiner = socketHasMiner({ minersHashmap, pdu, socket })
                    const minerData = getMinerInSocket({ pdu, socket, minersHashmap })
                    const gridColor =
                      SITE_OVERVIEW_GRID_UNIT_COLORS[
                        getSocketStatus({ minersHashmap, pdu, socket })
                      ]

                    return (
                      <div
                        key={socket.socket}
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
                          onClick={() => !isDisabled && onSocketClickHandler(pdu, socket)}
                        >
                          <div
                            className={cn([
                              'mdk-grid-unit__miner-box',
                              hasMiner && 'socket-container',
                              hasMiner && 'mdk-grid-unit__miner-box--selectable',
                              isSelected(pdu, socket) && 'mdk-grid-unit__miner-box--selected',
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
                            <div>{minerData?.hashrate?.value}</div>
                            <div>{minerData?.hashrate?.unit}</div>
                            <span className="mdk-grid-unit__miner-id">{socket.socket}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
