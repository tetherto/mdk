import { useState } from "react";

import { Button, ConfirmDeleteSparePartModal } from "@tetherto/mdk-react-devkit";

export const ConfirmDeleteSparePartModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete Spare Part
      </Button>
      <ConfirmDeleteSparePartModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={async () => setIsOpen(false)}
        sparePart={{ id: "sp-001", code: "HB-A001" }}
      />
    </div>
  );
};
