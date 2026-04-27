export const firstNumeric = (...candidates: unknown[]): number | undefined => {
  for (const value of candidates) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    }
  }

  return undefined
}
