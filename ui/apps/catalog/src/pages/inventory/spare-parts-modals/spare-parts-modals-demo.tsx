import { useState } from 'react'

import {
  AddSparePartModal,
  BatchMoveSparePartsModal,
  BulkAddSparePartsModal,
  ConfirmDeleteSparePartModal,
  MoveSparePartModal,
  SPARE_PART_LOCATION_LABELS,
  SPARE_PART_LOCATIONS,
  SPARE_PART_STATUS_NAMES,
  SPARE_PART_STATUSES,
  SparePartNames,
  SparePartSubTypesModal,
  SparePartTypes
} from '@tetherto/mdk-react-devkit/domain'
import { Button } from '@tetherto/mdk-react-devkit/primitives'

import { DemoBlock } from '../../../components/demo-block'
import { DemoPageHeader } from '../../../components/demo-page-header'

const PART_TYPES = Object.entries(SparePartTypes).map(([, value]) => ({
  value,
  label: SparePartNames[value as keyof typeof SparePartNames] ?? value,
}))

const MODEL_OPTIONS_MAP: Record<string, Array<{ value: string; label: string }>> = {
  [SparePartTypes.CONTROLLER]: [
    { value: 'CT-S19', label: 'CT-S19' },
    { value: 'CT-S19j', label: 'CT-S19j' },
  ],
  [SparePartTypes.PSU]: [{ value: 'PSU-3000W', label: 'PSU-3000W' }],
  [SparePartTypes.HASHBOARD]: [
    { value: 'HB-S19', label: 'HB-S19' },
    { value: 'HB-S19j', label: 'HB-S19j' },
  ],
}

const MINER_MODEL_OPTIONS = [
  { value: 'antminer-s19', label: 'Antminer S19' },
  { value: 'antminer-s19j', label: 'Antminer S19j' },
]

const LOCATION_OPTIONS = Object.values(SPARE_PART_LOCATIONS)
  .filter((v) => v !== SPARE_PART_LOCATIONS.SITE_CONTAINER)
  .map((v) => ({ value: v, label: SPARE_PART_LOCATION_LABELS[v] ?? v }))

const STATUS_OPTIONS = Object.values(SPARE_PART_STATUSES).map((status) => ({
  value: status,
  label: SPARE_PART_STATUS_NAMES[status as keyof typeof SPARE_PART_STATUS_NAMES] ?? status,
}))

const MOCK_SPARE_PART = {
  id: 'sp-001',
  code: 'HB-A001',
  type: 'HB-S19',
  site: 'Site A',
  serialNum: 'SN123456',
  location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE,
  status: SPARE_PART_STATUSES.OK_BRAND_NEW,
}

const MOCK_SPARE_PARTS_BATCH = [
  { id: 'sp-001', code: 'HB-A001', location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE, status: SPARE_PART_STATUSES.OK_BRAND_NEW },
  { id: 'sp-002', code: 'HB-A002', location: SPARE_PART_LOCATIONS.WORKSHOP_LAB, status: SPARE_PART_STATUSES.FAULTY },
  { id: 'sp-003', code: 'CB-B001', location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE, status: SPARE_PART_STATUSES.OK_RECOVERED },
]

const INITIAL_SUB_TYPES: Record<string, string[]> = {
  [SparePartTypes.CONTROLLER]: ['CT-S19', 'CT-S19j'],
  [SparePartTypes.PSU]: ['PSU-3000W'],
  [SparePartTypes.HASHBOARD]: ['HB-S19', 'HB-S19j'],
}

export const SparePartsModalsDemo = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [activePartType, setActivePartType] = useState(PART_TYPES[0]?.value ?? '')
  const [moveOpen, setMoveOpen] = useState(false)
  const [batchMoveOpen, setBatchMoveOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [subTypesOpen, setSubTypesOpen] = useState(false)
  const [subTypesActiveId, setSubTypesActiveId] = useState(PART_TYPES[0]?.value ?? '')
  const [subTypesMap, setSubTypesMap] = useState(INITIAL_SUB_TYPES)

  const modelOptions = MODEL_OPTIONS_MAP[activePartType] ?? []
  const isController = activePartType === SparePartTypes.CONTROLLER

  const handleAddSubType = async (name: string) => {
    const existing = subTypesMap[subTypesActiveId] ?? []
    if (existing.includes(name)) {
      return { error: 'Subtype already exists' }
    }
    setSubTypesMap((prev) => ({ ...prev, [subTypesActiveId]: [...existing, name] }))
    return {}
  }

  return (
    <div>
      <DemoPageHeader
        title="Spare Parts Modals"
        description="Modals for managing spare parts inventory: Add, Move, Bulk Add, Batch Move, SubTypes, Confirm Delete."
      />

      <div className="demo-section">
        <DemoBlock title="Add Spare Part">
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            Register Part
          </Button>
          <AddSparePartModal
            isOpen={addOpen}
            onClose={() => setAddOpen(false)}
            partTypes={PART_TYPES}
            defaultPartTypeId={activePartType}
            modelOptions={modelOptions}
            minerModelOptions={MINER_MODEL_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            locationOptions={LOCATION_OPTIONS}
            isControllerPartTypeSelected={isController}
            onPartTypeChange={(id) => setActivePartType(id)}
            onSubmit={async () => {
              setAddOpen(false)
            }}
            subTypesPartTypes={PART_TYPES}
            subTypesActivePartTypeId={subTypesActiveId}
            subTypes={subTypesMap[subTypesActiveId] ?? []}
            onSubTypesPartTypeChange={setSubTypesActiveId}
            onAddSubType={handleAddSubType}
          />
        </DemoBlock>

        <DemoBlock title="Move Spare Part">
          <Button variant="outline" onClick={() => setMoveOpen(true)}>
            Move Spare Part
          </Button>
          <MoveSparePartModal
            isOpen={moveOpen}
            onClose={() => setMoveOpen(false)}
            sparePart={MOCK_SPARE_PART}
            locationOptions={LOCATION_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            onSubmit={async () => {
              setMoveOpen(false)
            }}
          />
        </DemoBlock>

        <DemoBlock title="Batch Move Spare Parts">
          <Button variant="outline" onClick={() => setBatchMoveOpen(true)}>
            Batch Move ({MOCK_SPARE_PARTS_BATCH.length} parts)
          </Button>
          <BatchMoveSparePartsModal
            isOpen={batchMoveOpen}
            onClose={() => setBatchMoveOpen(false)}
            spareParts={MOCK_SPARE_PARTS_BATCH}
            locationOptions={LOCATION_OPTIONS}
            statusOptions={STATUS_OPTIONS}
            onSubmit={async () => {
              setBatchMoveOpen(false)
            }}
          />
        </DemoBlock>

        <DemoBlock title="Bulk Add Spare Parts (CSV)">
          <Button variant="primary" onClick={() => setBulkAddOpen(true)}>
            Bulk Add Parts
          </Button>
          <BulkAddSparePartsModal
            isOpen={bulkAddOpen}
            onClose={() => setBulkAddOpen(false)}
            onSubmit={async () => {
              setBulkAddOpen(false)
            }}
          />
        </DemoBlock>

        <DemoBlock title="Spare Part SubTypes">
          <Button variant="outline" onClick={() => setSubTypesOpen(true)}>
            View Subtypes
          </Button>
          <SparePartSubTypesModal
            isOpen={subTypesOpen}
            onClose={() => setSubTypesOpen(false)}
            partTypes={PART_TYPES}
            activePartTypeId={subTypesActiveId}
            onPartTypeChange={setSubTypesActiveId}
            subTypes={subTypesMap[subTypesActiveId] ?? []}
            onAddSubType={handleAddSubType}
          />
        </DemoBlock>

        <DemoBlock title="Confirm Delete Spare Part">
          <Button variant="outline" onClick={() => setConfirmDeleteOpen(true)}>
            Delete Spare Part
          </Button>
          <ConfirmDeleteSparePartModal
            isOpen={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            onConfirm={async () => setConfirmDeleteOpen(false)}
            sparePart={{ id: 'sp-001', code: 'HB-A001' }}
          />
        </DemoBlock>
      </div>
    </div>
  )
}
