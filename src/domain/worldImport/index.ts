import { applyImport, type ImportSummary } from './apply'
import { validateReferences } from './references'
import { validateWorldExport } from './schema'
import type { ImportError } from './validation'
import type { WorldStores } from '../stores'

export type { ImportError } from './validation'
export type { ImportSummary } from './apply'

export type ImportResult =
  { ok: true; summary: ImportSummary } | { ok: false; errors: ImportError[] }

/**
 * Reads a JSON payload into the world: parse, validate the structure, check
 * that every reference resolves, and only then apply it to the stores.
 */
export function importWorld(stores: WorldStores, json: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, errors: [{ code: 'INVALID_JSON' }] }
  }

  const { errors: structureErrors, value } = validateWorldExport(raw)
  if (value === null) return { ok: false, errors: structureErrors }

  const referenceErrors = validateReferences(stores, value)
  if (referenceErrors.length > 0) return { ok: false, errors: referenceErrors }

  return { ok: true, summary: applyImport(stores, value) }
}
