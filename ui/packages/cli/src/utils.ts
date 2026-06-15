export const toPascalCase = (name: string): string =>
  name
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')

export const placeholderFor = (type: string): string => {
  if (/boolean/.test(type)) return '{false}'
  if (/number/.test(type)) return '{0}'
  if (/=>|Function/.test(type)) return '{() => {}}'
  if (/\[\]$/.test(type) || /Array</.test(type)) return '{[]}'
  if (/Record<|^\{.*\}$|^Partial</.test(type)) return '{{}}'
  return '"TODO"'
}
