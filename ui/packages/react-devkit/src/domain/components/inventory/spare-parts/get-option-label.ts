import _find from "lodash/find";

import type { FormSelectOption } from "@primitives";

// Resolves a select option's display label, falling back to the raw value.
// Designed to be partially applied (lodash/partial) with a fixed options list:
//   const getLocationLabel = _partial(getOptionLabel, locationOptions);
export const getOptionLabel = (options: FormSelectOption[], value: string): string =>
  _find(options, { value })?.label ?? value;
