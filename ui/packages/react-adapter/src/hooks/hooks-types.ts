// ============================================================================
// Miner Duplicate Validation Types
// ============================================================================

/**
 * Identifier fields that participate in miner-uniqueness checks.
 *
 * Passed to {@link useMinerDuplicateValidation}'s `checkDuplicate` to find
 * existing miners that collide on MAC address, serial number, IP, or
 * human-facing code. All fields are optional so callers can validate a
 * partially-filled form as the user types.
 */
export type MinerValidationData = {
  macAddress?: string | null
  serialNumber?: string | null
  address?: string
  code?: string
}
