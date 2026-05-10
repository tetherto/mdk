/**
 * Canonical Zod schema for `*.public-surface.json`.
 * Keep in sync with [`schema.ts`](./schema.ts) (types + docs).
 */

import { z } from 'zod'

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
]

export const PublicSurfaceMember = z.object({
  name: z.string(),
  required: z.boolean(),
  type: z.string().nullable(),
  summary: z.string().nullable(),
})

export const PublicSurfaceParameter = z.object({
  name: z.string(),
  required: z.boolean(),
  type: z.string().nullable(),
  defaultValue: z.string().nullable(),
  summary: z.string().nullable(),
})

export const PublicSurfaceSignature = z.object({
  parameters: z.array(PublicSurfaceParameter),
  returnType: z.string().nullable(),
  returnSummary: z.string().nullable(),
})

export const PublicSurfaceExport = z.object({
  name: z.string(),
  package: z.enum(['core', 'foundation']),
  kind: z.enum([
    'component',
    'hook',
    'function',
    'value',
    'const',
    'type',
    'class',
    'enum',
    'namespace',
  ]),
  namespace: z.string().nullable(),
  sourcePath: z.string(),
  summary: z.string().nullable(),
  members: z.array(PublicSurfaceMember).optional(),
  signature: PublicSurfaceSignature.optional(),
  aliasOf: z.string().optional(),
  type: z.string().optional(),
})

export const PublicSurfaceDocument = z.object({
  _meta: z.object({
    status: z.enum(['experimental', 'stable']),
    framework: z.literal('react'),
    schemaVersion: z.literal('1.0'),
    disclaimer: z.string(),
    generator: z.string(),
    typedocVersion: z.string(),
  }),
  package: z.enum(['core', 'foundation']),
  generatedAt: z.string(),
  exports: z.array(PublicSurfaceExport),
})

export function validatePublicSurface(doc) {
  return PublicSurfaceDocument.parse(doc)
}
