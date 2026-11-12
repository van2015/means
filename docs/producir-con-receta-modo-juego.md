# Historia #12 — Producir usando una receta en modo juego

## Story

Como usuario en modo juego, quiero producir usando una receta del catálogo o propia del agente poseído, para que consuma de su inventario y genere resultados.

Requires: #1, #5, #8

## Acceptance criteria

- [x] Dado que poseo un agente, entonces veo las recetas del catálogo general y las recetas propias del agente, cada una con un botón "Producir".
- [x] Dado que el inventario tiene material suficiente para todas las entradas, cuando pulso "Producir", entonces el inventario descuenta las entradas y añade las salidas con sus cantidades.
- [x] Dado que falta material para alguna entrada, cuando pulso "Producir", entonces veo un error que indica qué bien falta (con cantidad requerida y disponible), el inventario no cambia y no se produce nada.
- [x] Dado que una entrada queda en 0 tras producir, entonces esa línea desaparece del inventario (no se muestran bienes con cantidad 0).
- [x] Dado que produzco con una receta propia del agente, entonces el comportamiento es idéntico al de una receta del catálogo.
- [x] Dado que produzco, cuando vuelvo a modo diseño y regreso a modo juego, entonces el inventario refleja lo producido (misma tienda, sin copias).
- [x] Dado que intento producir con una receta inexistente o sin agente poseído (casos de dominio), entonces el estado no cambia y se devuelve un error.

## Plan

1. **Dominio — `src/domain/agentStore.ts`**: nuevo método `produce(agentId, recipeRef)`:
   - Resuelve agente (`AGENT_NOT_FOUND`) y receta (`RECIPE_NOT_FOUND`) usando la misma lógica de `ruleRecipeExists` (fuente `catalog` → `recipeStore`, fuente `agent` → `agent.recipes`).
   - Valida **todas** las entradas antes de tocar nada: para cada línea de entrada compara `agent.quantityOf(goodId)` con la cantidad requerida; si alguno falta, devuelve `{ ok: false, errors: [{ code: 'INSUFFICIENT_GOOD', goodName, required, available }] }` sin cambios.
   - Calcula el inventario nuevo como agregado por bien (`Map<goodId, quantity>`): resta entradas, suma salidas, **elimina las líneas que quedan en 0** y conserva el orden de primera aparición de los bienes existentes; los bienes nuevos (salidas que no estaba en el inventario) se añaden al final.
   - Persiste con `replaceAgent` (variante que también sustituye el inventario: ampliar la firma o añadir `replaceAgentInventory`; decisión interna, sin cambiar la API pública existente).
   - Nuevo tipo `ProductionError` en `src/domain/agent.ts` (o junto al store): `AGENT_NOT_FOUND | RECIPE_NOT_FOUND | INSUFFICIENT_GOOD { goodName, required, available }`.
2. **i18n — `src/i18n/errors.ts`**: caso `INSUFFICIENT_GOOD` → `Falta {goodName}: necesitas {required}, tienes {available}` (los demás códigos ya existen).
3. **Presentador — `src/presentation/playModePresenter.ts`**: método `produce(recipeRef)`:
   - No-op si no hay agente poseído (la UI solo lo muestra con poseído, guarda defensiva).
   - Delega en `agentStore.produce`; en éxito limpia `error` y notifica; en fallo pone el mensaje vía `errorMessage` y notifica (el inventario visible se relee del store).
4. **UI — `src/react/PlayMode.tsx`**: cuarto bloque "Producir" dentro de la sección del agente poseído:
   - Dos listas `ul` ("Recetas del catálogo" / "Recetas de {nombre}") o una sola con etiqueta de origen — ver suggestions.
   - Cada fila: nombre de la receta, resumen de entradas → salidas (reutiliza `goodName` y el formato "Insumo:/Producto:" ya usado) y botón **"Producir"**.
   - Sin poseído no se muestra; recetas de ambos orígenes con `aria-label` diferenciado para los tests.
   - El error se pinta con el `role="alert"` existente.
5. **Tests**:
   - `test/domain/agentStore.test.ts`: produce con receta de catálogo (descuenta y suma), produce con receta propia, falta de material → `INSUFFICIENT_GOOD` con cantidades correctas y sin cambios, entrada a 0 desaparece, bien nuevo añadido al final, `RECIPE_NOT_FOUND`, `AGENT_NOT_FOUND`, y que una receta ajena (`source: 'agent'` de otro agente) no es producible.
   - `test/presentation/playModePresenter.test.ts`: `produce` happy path actualiza inventario y limpia error, con error propaga mensaje y no cambia inventario, sin poseído no hace nada.
   - `test/components/PlayMode.test.tsx`: listas de recetas visibles con botones, producir actualiza el inventario en pantalla, error de material visible y sin cambios, recetas propias también producibles.
   - `test/e2e/userJourneys.test.tsx` — journey 12: diseño (bienes Harina/Pan, receta 2 Harina → 1 Pan, agente con Harina 10) → juego → poseer → producir → inventario Harina 8 / Pan 1 → producir hasta agotar → error "Falta Harina…" y sin cambios → producir con receta propia → verificar.
6. **Documentación**: marcar `#12` en `docs/backlog.md`.

## Out of scope

- Ejecución automática de reglas en agentes no poseídos (historia #13) — `produce` será su pieza de dominio reutilizable, pero el bucle no entra aquí.
- Producir sin poseer al agente (el jugador no tiene inventario; la producción manual es solo sobre el poseído).
- Colas de producción, tiempo/costes de energía, producir varias veces seguidas de golpe (un clic = una ejecución de la receta).
- Cambiar inventario o recetas desde modo diseño (ya existe) — aquí es solo producción.

## Suggestions (your call)

- **Agrupación de recetas en la UI**: propuesto dos sublistas con encabezado ("Catálogo general" / "Recetas del agente"), igual que los `optgroup` del selector de reglas en modo diseño. Alternativa: una sola lista mezclada con etiqueta de origen por fila.
- **Botón siempre activo vs. deshabilitado si falta material**: propuesto **activo siempre** + error en `role="alert"` al pulsar, porque así el usuario descubre qué le falta (con deshabilitado no habría explicación). Si prefieres deshabilitar cuando `quantityOf` no alcanza, habría que exponer un predicado `canProduce` en el presentador.
- **Líneas a 0**: propuesto eliminarlas del inventario (la historia #10 ya muestra "{bien}: {cantidad}" y un 0 ruido visual). Alternativa: conservarlas con cantidad 0.
- **Agregación por bien**: el inventario se reconstruye como una línea por bien (los cálculos de `quantityOf` suman líneas, así que es equivalente incluso si el modo diseño creó líneas duplicadas).
