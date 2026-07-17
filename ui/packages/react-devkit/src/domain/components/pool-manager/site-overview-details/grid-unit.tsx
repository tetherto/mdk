import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import {
  getControlSectionsTooltips,
  useDeviceResolution,
  useKeyDown,
  usePduViewer,
  usePlatform,
} from '@tetherto/mdk-react-adapter'
import type React from 'react'
import { lazy, Suspense } from 'react'

import { Button, SimpleTooltip } from '@primitives'

import { isAntspaceHydro, isMicroBT } from '../../../utils/container-utils'

import type { ContainerInfo } from '../../../types'
import { GridRows } from './grid-rows'
import './grid-unit.scss'
import { getMinerInSocket } from './site-overview-details-utils'
import type { MinerData, Pdu, PduSocket } from './use-site-overview-details-data'

// react-zoom-pan-pinch (~808K) is code-split into a lazy chunk so importing the
// pool-manager surface does not pull the pan/zoom engine into a consumer's
// initial bundle. The grid renders immediately via the Suspense fallback; pan
// and zoom activate once the chunk loads.
const GridUnitViewer = lazy(() => import('./grid-unit-viewer'))

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

  const onSocketClickHandler = (pdu: Pdu, socket: PduSocket) => {
    onSocketClick(
      { ...containerInfo, rack: connectedMiners[0]?.rack },
      pdu.pdu,
      socket.socket,
      getMinerInSocket({ minersHashmap, pdu, socket }),
    )
  }

  const isColumn = type ? !isAntspaceHydro(type) && !isMicroBT(type) : false

  const grid = (
    <GridRows
      pdus={segregatedPduSections[sectionKey] ?? []}
      type={type}
      isHeatmapMode={isHeatmapMode}
      isColumn={isColumn}
      minersHashmap={minersHashmap}
      disableMinerSelect={disableMinerSelect}
      selectedItems={selectedItems}
      getSelectableName={getSelectableName}
      onRowSelect={handleUnitRowSelect}
      onSocketClick={onSocketClickHandler}
    />
  )

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

      <Suspense
        fallback={
          <div className="mdk-grid-unit__viewer-wrapper">
            <div className="mdk-grid-unit__viewer-content">{grid}</div>
          </div>
        }
      >
        <GridUnitViewer
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
          wrapperClass="mdk-grid-unit__viewer-wrapper"
          contentClass="mdk-grid-unit__viewer-content"
        >
          {grid}
        </GridUnitViewer>
      </Suspense>
    </div>
  )
}
