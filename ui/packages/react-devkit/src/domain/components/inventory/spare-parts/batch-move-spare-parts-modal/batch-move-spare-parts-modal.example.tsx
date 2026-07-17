import { useState } from "react";

import {
  BatchMoveSparePartsModal,
  Button,
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

const mockSpareParts = [
  { id: "sp-001", code: "HB-A001", location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE, status: SPARE_PART_STATUSES.OK_BRAND_NEW },
  { id: "sp-002", code: "HB-A002", location: SPARE_PART_LOCATIONS.WORKSHOP_LAB, status: SPARE_PART_STATUSES.FAULTY },
  { id: "sp-003", code: "CB-B001", location: SPARE_PART_LOCATIONS.SITE_WAREHOUSE, status: SPARE_PART_STATUSES.OK_RECOVERED },
];

export const BatchMoveSparePartsModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Batch Move ({mockSpareParts.length} parts)
      </Button>
      <BatchMoveSparePartsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        spareParts={mockSpareParts}
        locationOptions={locationOptions}
        statusOptions={statusOptions}
        onSubmit={async () => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
