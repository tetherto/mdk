/**
 * The values to draw so every visible non-zero slice spans at least `minSliceAngle` degrees.
 * Slices under the minimum are raised to it and the rest shrink in proportion, so the drawn
 * values still sum to the visible total. Hidden and zero slices keep their value. With no
 * minimum, or when the minimum can't fit every slice, the values are returned unchanged.
 */
export const drawnSliceValues = (
  values: number[],
  minSliceAngle: number,
  hidden: Record<number, boolean> = {},
): number[] => {
  const visible = values
    .map((value, index) => ({ value, index }))
    .filter(({ value, index }) => !hidden[index] && value > 0)
  const total = visible.reduce((sum, { value }) => sum + value, 0)
  const minShare = minSliceAngle / 360
  if (minShare <= 0 || total <= 0 || minShare * visible.length >= 1) return values

  // Raise the smallest slices one by one: each raised slice takes `minShare`, and the slices left
  // share what remains by value, which can push another one under the minimum.
  const raised = new Set<number>()
  let rest = visible
  for (;;) {
    const restTotal = rest.reduce((sum, { value }) => sum + value, 0)
    const restShare = 1 - raised.size * minShare
    const under = rest.filter(({ value }) => (value / restTotal) * restShare < minShare)
    if (under.length === 0) break
    for (const { index } of under) raised.add(index)
    rest = rest.filter(({ index }) => !raised.has(index))
  }

  const restTotal = rest.reduce((sum, { value }) => sum + value, 0)
  const restShare = 1 - raised.size * minShare
  const drawn = [...values]
  for (const index of raised) drawn[index] = minShare * total
  for (const { value, index } of rest) drawn[index] = (value / restTotal) * restShare * total
  return drawn
}
