import _get from "lodash/get";
import _map from "lodash/map";

import { SPARE_PART_DETAIL_ATTRIBUTES } from "./move-spare-part-modal.constants";
import type { SparePartDetailsProps } from "./move-spare-part-modal.types";

/**
 * Presentational key-value list of a spare part's attributes (code, model, site, serial number,
 * MAC). Renders data only; used inside the move/confirm spare-part dialogs but safe to compose
 * standalone.
 *
 * @category misc
 * @domain device-management
 * @tier advanced
 */
export const SparePartDetails = ({ sparePart }: SparePartDetailsProps) => (
  <div className="mdk-spare-part-details">
    {_map(SPARE_PART_DETAIL_ATTRIBUTES, ({ label, accessor }) => {
      const value = _get(sparePart, accessor);
      return (
        <div key={label} className="mdk-spare-part-details__row">
          <span className="mdk-spare-part-details__label">{label}:</span>
          <span className="mdk-spare-part-details__value">{value != null ? String(value) : "—"}</span>
        </div>
      );
    })}
  </div>
);
