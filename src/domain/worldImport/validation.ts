export type ImportError =
  | { code: 'INVALID_JSON' }
  | { code: 'UNSUPPORTED_VERSION'; version: unknown }
  | { code: 'INVALID_STRUCTURE'; path: string }
  | { code: 'DUPLICATE_NAME'; kind: 'bien' | 'receta' | 'agente'; name: string }
  | {
      code: 'MISSING_REFERENCE'
      kind: 'bien' | 'receta'
      name: string
      source: 'receta' | 'agente'
      sourceName: string
    }

type DuplicateKind = Extract<ImportError, { code: 'DUPLICATE_NAME' }>['kind']

/**
 * Collects the errors of one validation pass. Validators report through it
 * instead of sharing a bare array, so every step can tell its own failures
 * apart from the ones already reported by an earlier one.
 */
export class ValidationContext {
  private readonly issues: ImportError[] = []

  /** Reports a structural problem found at the given path. */
  invalid(path: string): void {
    this.issues.push({ code: 'INVALID_STRUCTURE', path })
  }

  push(error: ImportError): void {
    this.issues.push(error)
  }

  /** Snapshot of the errors reported so far, for a scoped check. */
  mark(): number {
    return this.issues.length
  }

  /** Whether anything was reported after the given snapshot. */
  failedSince(mark: number): boolean {
    return this.issues.length > mark
  }

  hasErrors(): boolean {
    return this.issues.length > 0
  }

  all(): ImportError[] {
    return this.issues
  }
}

/**
 * Registers a name inside a section, reporting the duplicate instead. Used by
 * every catalog that must not repeat a name (goods, recipes, agents).
 */
function registerName(
  names: Set<string>,
  name: string,
  kind: DuplicateKind,
  ctx: ValidationContext,
): boolean {
  if (names.has(name)) {
    ctx.push({ code: 'DUPLICATE_NAME', kind, name })
    return true
  }
  names.add(name)
  return false
}

/**
 * Validates every item of a list and keeps the names of the section unique.
 * Shared by the three catalogs that cannot repeat a name (goods, recipes and
 * agents, whether they live at the root or inside an agent).
 */
export function collectUnique<T extends { name: string }>(
  raw: unknown[],
  pathPrefix: string,
  kind: DuplicateKind,
  validateItem: (item: unknown, path: string, ctx: ValidationContext) => T | null,
  ctx: ValidationContext,
): T[] {
  const items: T[] = []
  const names = new Set<string>()
  raw.forEach((item, index) => {
    const value = validateItem(item, `${pathPrefix}[${index}]`, ctx)
    if (value === null) return
    if (registerName(names, value.name, kind, ctx)) return
    items.push(value)
  })
  return items
}
