import { useState } from "react";

import {
  AddSparePartModal,
  Button,
  SPARE_PART_LOCATION_LABELS,
  SPARE_PART_LOCATIONS,
  SPARE_PART_STATUS_NAMES,
  SPARE_PART_STATUSES,
  SparePartNames,
  SparePartTypes,
} from "@tetherto/mdk-react-devkit";

const PART_TYPES = Object.entries(SparePartTypes).map(([, value]) => ({
  value,
  label: SparePartNames[value as keyof typeof SparePartNames] ?? value,
}));

const MINER_MODEL_OPTIONS = [
  { value: "antminer-s19", label: "Antminer S19" },
  { value: "antminer-s19j", label: "Antminer S19j" },
  { value: "whatsminer-m30s", label: "Whatsminer M30S" },
];

const MODEL_OPTIONS_MAP: Record<string, Array<{ value: string; label: string }>> = {
  [SparePartTypes.CONTROLLER]: [
    { value: "CT-S19", label: "CT-S19" },
    { value: "CT-S19j", label: "CT-S19j" },
  ],
  [SparePartTypes.PSU]: [{ value: "PSU-3000W", label: "PSU-3000W" }],
  [SparePartTypes.HASHBOARD]: [
    { value: "HB-S19", label: "HB-S19" },
    { value: "HB-S19j", label: "HB-S19j" },
  ],
};

const STATUS_OPTIONS = Object.values(SPARE_PART_STATUSES).map((value) => ({
  value,
  label: SPARE_PART_STATUS_NAMES[value as keyof typeof SPARE_PART_STATUS_NAMES] ?? value,
}));

const LOCATION_OPTIONS = Object.values(SPARE_PART_LOCATIONS).map((value) => ({
  value,
  label: SPARE_PART_LOCATION_LABELS[value] ?? value,
}));

export const AddSparePartModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePartType, setActivePartType] = useState(PART_TYPES[0]?.value ?? "");

  const modelOptions = MODEL_OPTIONS_MAP[activePartType] ?? [];
  const isController = activePartType === SparePartTypes.CONTROLLER;

  return (
    <div>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Register Part
      </Button>
      <AddSparePartModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        partTypes={PART_TYPES}
        defaultPartTypeId={activePartType}
        modelOptions={modelOptions}
        minerModelOptions={MINER_MODEL_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        locationOptions={LOCATION_OPTIONS}
        isControllerPartTypeSelected={isController}
        onPartTypeChange={(id) => setActivePartType(id)}
        onSubmit={async () => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
