import { useState } from "react";

import { Button, SparePartSubTypesModal } from "@tetherto/mdk-react-devkit";

const PART_TYPES = [
  { value: "inventory-miner_part-controller", label: "Controller" },
  { value: "inventory-miner_part-psu", label: "PSU" },
  { value: "inventory-miner_part-hashboard", label: "Hashboard" },
];

const INITIAL_SUB_TYPES: Record<string, string[]> = {
  "inventory-miner_part-controller": ["CT-S19", "CT-S19j"],
  "inventory-miner_part-psu": ["PSU-3000W"],
  "inventory-miner_part-hashboard": ["HB-S19", "HB-S19j", "HB-S19XP"],
};

export const SparePartSubTypesModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState(PART_TYPES[0]?.value ?? "");
  const [subTypesMap, setSubTypesMap] = useState(INITIAL_SUB_TYPES);

  const handleAddSubType = async (name: string): Promise<{ error: string } | void> => {
    const existing = subTypesMap[activeId] ?? [];
    if (existing.includes(name)) return { error: "Subtype already exists" };
    setSubTypesMap((prev) => ({ ...prev, [activeId]: [...existing, name] }));
  };

  return (
    <div>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        View Subtypes
      </Button>
      <SparePartSubTypesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        partTypes={PART_TYPES}
        activePartTypeId={activeId}
        onPartTypeChange={setActiveId}
        subTypes={subTypesMap[activeId] ?? []}
        onAddSubType={handleAddSubType}
      />
    </div>
  );
};
