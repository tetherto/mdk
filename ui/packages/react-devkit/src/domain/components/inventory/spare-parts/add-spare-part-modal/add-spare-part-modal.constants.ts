/** MAC address format: six hex octets separated by ":" or "-" (case-insensitive). */
export const MAC_ADDRESS_REGEX = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;

/** Validation error shown when a controller's MAC address does not match {@link MAC_ADDRESS_REGEX}. */
export const INVALID_MAC_ADDRESS_ERROR = "Requires a valid format: E.G. 00:1A:2B:3C:4D:5E";
