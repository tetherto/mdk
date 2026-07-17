import { useState } from "react";

import { BulkAddSparePartsModal, Button } from "@tetherto/mdk-react-devkit";

export const BulkAddSparePartsModalExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Bulk Add Parts
      </Button>
      <BulkAddSparePartsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={async () => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
