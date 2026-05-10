/**
 * TypeScript types for `*.public-surface.json`.
 * Runtime validation lives in [`schema.mjs`](./schema.mjs) (Zod); keep shapes aligned.
 */

export const PUBLIC_SURFACE_KINDS = [
  'component',
  'hook',
  'function',
  'value',
  'const',
  'type',
  'class',
  'enum',
  'namespace',
] as const

export type PublicSurfaceKind = (typeof PUBLIC_SURFACE_KINDS)[number]

export type PublicSurfaceMember = {
  name: string
  required: boolean
  type: string | null
  summary: string | null
}

export type PublicSurfaceParameter = {
  name: string
  required: boolean
  type: string | null
  defaultValue: string | null
  summary: string | null
}

export type PublicSurfaceSignature = {
  parameters: PublicSurfaceParameter[]
  returnType: string | null
  returnSummary: string | null
}

/** One exported symbol from a package barrel. */
export type PublicSurfaceExport = {
  name: string
  package: 'core' | 'foundation'
  kind: PublicSurfaceKind
  namespace: string | null
  /** Relative path under `ui-client/`; empty when TypeDoc has no source (re-export). */
  sourcePath: string
  summary: string | null
  members?: PublicSurfaceMember[]
  signature?: PublicSurfaceSignature
  aliasOf?: string
  type?: string
}

export type PublicSurfaceMeta = {
  status: 'experimental' | 'stable'
  framework: 'react'
  schemaVersion: '1.0'
  disclaimer: string
  generator: string
  typedocVersion: string
}

export type PublicSurfaceDocument = {
  _meta: PublicSurfaceMeta
  package: 'core' | 'foundation'
  generatedAt: string
  exports: PublicSurfaceExport[]
}
