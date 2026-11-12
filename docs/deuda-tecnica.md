# Deuda técnica localizada y corregida

## Contexto

Durante la revisión del backlog completado (17/17) se identificaron tres puntos de deuda. Se corrigieron en la rama `feature/correccion-deuda-tecnica` tras confirmar el enfoque con el usuario (la persistencia se resolvió con `localStorage`, no con backend).

## 1. Prioridad no validada en modo diseño

**Problema:** `validateRule` no recibía la prioridad y `AgentRulePresenter.submit` hacía `Number(priorityValue)` — `Number('')` es `0`, que es finito, así que un campo de prioridad vacío creaba silenciosamente una regla con prioridad 0. El código `INVALID_PRIORITY` solo lo usaba `updateRulePriority` (modo juego).

**Arreglo:**

- `validateRule(recipeId, condition, priority)` valida `Number.isFinite(priority)` → `INVALID_PRIORITY`.
- El presentador convierte el borrador vacío a `NaN` (mismo patrón ya usado en modo juego en #11) para que llegue rechazado al dominio.
- `0` sigue siendo una prioridad válida si el usuario la teclea explícitamente.

**Tests:** `test/domain/agentStore.test.ts` (3: rechazo al crear, al editar, cero aceptado), `test/presentation/agentRulePresenter.test.ts` (2: borrador vacío rechazado sin tocar la tienda, cero aceptado).

## 2. Reglas huérfanas al borrar recetas

**Problema:** borrar una receta del catálogo (o una receta propia de un agente) dejaba sus reglas con el nombre de la receta **vacío** en modo diseño y modo juego (`recipeName()` devolvía `''`).

**Arreglo (decisión de diseño):** no se borran reglas en cascada — sería destructivo (borraría configuración del usuario sin avisar) y las reglas siguen siendo reparables con "Editar" (reapuntar) o "Eliminar" manualmente en modo diseño. En su lugar, `recipeName()` en `src/react/catalogHelpers.ts` devuelve **`'(receta borrada)'`**: la regla queda visible, con indicador explícito de su estado y editable.

**Tests:** `test/components/DesignMode.test.tsx` (placeholder tras borrar receta de catálogo + regla aún editable), `test/components/PlayMode.test.tsx` (placeholder en reglas del agente poseído).

**Nota:** la exportación (#14) no incluye estas reglas rotas (`buildExport` las salta) y la importación las rechazaría (`MISSING_REFERENCE`), por lo que el flujo export/import se mantiene consistente.

## 3. Sin persistencia (todo en memoria)

**Problema:** el mundo completo se perdía al recargar la página. El stack objetivo del backlog menciona Node + SQLite, pero construir backend era una iniciativa nueva, no una corrección; se acordó **localStorage**.

**Arreglo:**

- Nuevo `src/persistence.ts` con `saveWorld(stores)` / `loadWorld(stores)`, reutilizando el serializador de la historia #14 (`buildExport` + `serializeExport` + `importWorld`), por lo que se beneficia de la validación todo-o-nada ya probada.
  - `saveWorld`: escritura **compare-before-write** (si el JSON no cambió, no escribe) para que las notificaciones frecuentes de los presenters (teclas en formularios) sean baratas; best-effort con `try/catch` (modo privado/cuota llena no rompen la app).
  - `loadWorld`: devuelve `false` si no hay nada o si el payload es corrupto/versión no soportada; los stores quedan intactos.
- `App` solo carga cuando **crea sus propias stores** (las stores inyectadas —tests— mantienen su ciclo de vida fuera de la persistencia).
- Guardado en el punto de enganche único: la suscripción a los presenters en `useDesignMode` y `usePlayMode` (todo cambio de store pasa por un `notify`, incluidos `produce` y `tick` del bucle de fondo).

**Tests:** `test/persistence.test.ts` (9: serialización, mundo vacío, roundtrip, ausente/corrupto/versión no soportada, error de cuota, escritura omitida si no cambia, simulación de recarga) y `test/components/App.test.tsx` (3: recarga con datos creados en UI, mundo sembrado en localStorage, mundo corrupto no rompe el arranque).

## Decisión anotada (fuera de alcance de este fix)

- **Backend Node + SQLite** sigue pendiente como posibilidad futura (el backlog no tiene historia para ello; `docs/exportar-importar-mundo.md` lo deja registrado).
- La **posesión del agente** y el modo activo no se persisten: son estado de sesión, no del mundo (al recargar empiezas en modo diseño sin poseer a nadie). Si se desea, sería una extensión natural de `persistence.ts`.

## Verificación

`tsc` ✅ · `eslint` ✅ · `prettier` ✅ · 248/248 tests ✅ (236 previos + 12 nuevos de deuda, netos tras adaptar `App.test.tsx` con aislamiento de localStorage).
