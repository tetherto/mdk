import { useState } from "react";

import {
  Button,
  MoveSparePartModal,
  SPARE_PART_LOCATION_LABELS,
  SPARE_PART_LOCATIONS,
  SPARE_PART_STATUS_NAMES,
  SPARE_PART_STATUSES,
} from "@tetherto/mdk-react-devkit";

const locationOptions = Object.values(SPARE_PART_LOCATIONS)
  .filter((value) => value !== SPARE_PART_LOCATIONS.SITE_CONTAINER)
  .map((value) => ({ value, label: SPARE_PART_LOCATION_LABELS[value] ?? value }));

const statusOptions = Object.values(SPARE_PART_STATUSES).map((value) => ({
  value,
  label: SPARE_PART_STATUS_NAMES[value as keyof typeof SPARE_PART_STATUS_NAMES] ?? value,
}));

const mockSparePart = {
  id: "sp-001",
  code: "HB-A001",
  type: "HB-S19",
  site: "Site A",
  serialNum: "SN123456",
  location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE,
  status: SPARE_PART_STATUSES.OK_BRAND_NEW,
};

export const MoveSparePartModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Move Spare Part
      </Button>
      <MoveSparePartModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sparePart={mockSparePart}
        locationOptions={locationOptions}
        statusOptions={statusOptions}
        onSubmit={async () => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
