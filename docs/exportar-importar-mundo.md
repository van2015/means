# Historia #14 — Exportar e importar una selección del mundo

## Story

Como usuario, quiero exportar e importar una selección de elementos del mundo (recetas, bienes/servicios, agentes o reglas), para compartir o respaldar partes del juego.

Requires: #1

## Acceptance criteria

- [x] Dado que estoy en modo diseño, veo una sección para seleccionar bienes/servicios, recetas y agentes (con sus recetas propias y reglas).
- [x] Dado que selecciono elementos y pulso "Exportar selección", entonces se descarga un archivo JSON que contiene los elementos elegidos **y sus dependencias** (los bienes que usan las recetas elegidas, las recetas que referencian las reglas de los agentes elegidos, etc.), de forma que el archivo sea autocontenido.
- [x] Dado que no he seleccionado nada, entonces el botón de exportar está deshabilitado.
- [x] Dado que importo un archivo JSON válido en un mundo vacío, entonces todos los elementos del archivo aparecen en los catálogos, conservando inventarios, recetas propias y reglas (prioridad, condición y receta referenciada).
- [x] Dado que importo un archivo con elementos cuyos nombres ya existen en el mundo, entonces esos elementos se omiten (importación idempotente) y el resumen lo indica.
- [x] Dado que el archivo es inválido (JSON roto, versión no soportada, estructura incorrecta o referencias rotas a bienes/recetas inexistentes), entonces se muestran errores, **no se importa nada** (todo-o-nada) y el mundo no cambia.
- [x] Dado que exporto una selección y la importo en otro mundo vacío, entonces el segundo mundo es equivalente al primero (roundtrip).

## Plan

1. **Dominio — nuevo `src/domain/worldTransfer.ts`** (funciones puras que reciben `Stores`):
   - Tipos: `WorldExport { version: 1, goods, recipes, agents }` con **referencias por nombre** (los ids se generan aleatoriamente por sesión, inútiles entre mundos; los nombres ya son únicos por catálogo — regla de AGENTS.md).
   - `buildExport(stores, selection)`: selección por ids (`goodIds`, `recipeIds`, `agentIds`) → **cierre de dependencias**: receta elegida arrastra sus bienes; agente elegido arrastra inventario, recetas propias, reglas y, para reglas con `source: 'catalog'`, la receta del catálogo referenciada (+ sus bienes). Deduplicado por nombre.
   - `serializeExport(exp): string` → `JSON.stringify(exp, null, 2)`.
   - `importWorld(stores, json)`: **todo-o-nada** en tres fases:
     1. `JSON.parse` → `INVALID_JSON`;
     2. validación de estructura (version === 1 → `UNSUPPORTED_VERSION`; campos/tipos/cantidades/operadores → `INVALID_STRUCTURE`; nombres duplicados dentro del archivo → `DUPLICATE_NAME`);
     3. validación de referencias contra archivo ∪ mundo existente → `MISSING_REFERENCE {kind, name, referencedBy}`;
     4. solo si todo pasa: aplicar en orden bienes → recetas → agentes (inventario, recetas propias, reglas resolviendo recetas por nombre), omitiendo nombres ya existentes → `ImportSummary { goods: {added, skipped}, recipes: {...}, agents: {...}, rules: added }`.
   - Reglas del agente: se serializan con `recipeRef` por nombre (`source` + nombre de receta) y condición por nombre de bien.
2. **i18n — `src/i18n/errors.ts`**: nuevo tipo `ImportError` + `importErrorMessage()` con los códigos anteriores (mensajes en castellano, patrón ya usado).
3. **Presentador — nuevo `src/presentation/worldTransferPresenter.ts`**: patrón `subscribe/notify`:
   - Selección (`Set` por tipo) con `toggleGood/toggleRecipe/toggleAgent`, `selectedCount`, `canExport`.
   - `exportJson(): string | null` (null sin selección), `importJson(json)` que guarda `importErrors` o `importSummary` y notifica; `clearResult()`.
   - Componerlo en `useDesignMode` exponiendo la API plana (patrón de los demás presenters).
4. **UI — nuevo `src/react/WorldTransferSection.tsx`** al final de `DesignMode`:
   - Tres grupos de checkboxes (bienes, recetas, agentes — con leyenda indicando que los agentes incluyen inventario, recetas y reglas).
   - Botón "Exportar selección (N)" deshabilitado si N = 0 → `Blob` + `URL.createObjectURL` + `<a download="means-mundo.json">` (patrón estándar, sin backend).
   - `<input type="file" accept=".json,application/json">` → `file.text()` → `importJson`; resetear el input para permitir reimportar el mismo archivo.
   - Resumen con `role="status"` ("Se importaron X, se omitieron Y") y errores con `role="alert"` (reutilizar `ValidationErrors` o lista propia).
   - Reutilizar clases existentes de `style.css`; sin tocar CSS salvo imprescindible.
5. **Tests**:
   - `test/domain/worldTransfer.test.ts`: cierre de dependencias (receta→bienes, agente→inventario/recetas/reglas/receta de catálogo), roundtrip export→import en mundo vacío equivalente, reimport idempotente (todo omitido), solapamiento parcial, referencias rotas → nada importado, JSON inválido, versión no soportada, duplicados en el archivo, reglas conservadas (prioridad/condición/receta).
   - `test/presentation/worldTransferPresenter.test.ts`: toggles y contadores, `exportJson` null sin selección, `importJson` con resumen/errores, notificación a suscriptores.
   - `test/components/WorldTransfer.test.tsx` (o en `DesignMode.test.tsx`): checkboxes desde los catálogos, botón deshabilitado sin selección, exportar con `URL.createObjectURL` mockeado produce el JSON esperado, importar archivo muestra resumen, archivo inválido muestra alerta sin tocar los catálogos.
   - `test/e2e/userJourneys.test.tsx` — journey 15: mundo completo en modo diseño → seleccionar todo → exportar (capturar el Blob mockeado) → nuevo `App` con stores vacíos → importar el archivo → verificar en la UI que bienes, recetas, agente, receta propia y regla (abriendo "Gestionar reglas") están todos; reimportar → resumen "omitidos".
6. **Documentación**: marcar `#14` en `docs/backlog.md` → **backlog completo (17/17)**.

## Out of scope

- Persistencia en backend/SQLite (el stack objetivo lo menciona, pero no hay historia en el backlog). **Nota:** se añadió persistencia local con `localStorage` (ver `docs/deuda-tecnica.md`); el backend sigue pendiente.
- Exportar/importar desde modo juego (la gestión del mundo es de modo diseño).
- Modo "reemplazar todo" al importar (solo fusion-omitir); importar solo parte de un archivo.
- Exportar estado de sesión (agente poseído, borradores de formulario).
- Copiar al portapapeles como alternativa al archivo; otros formatos (YAML, binario).
- Comprimir/comprimir, cifrado, cuota de tamaño.

## Suggestions (your call)

- **Las reglas viajan con su agente**: la historia lista "agentes o reglas" como elementos seleccionables, pero una regla no tiene significado sin su agente (se ejecuta en su contexto) y el cierre de dependencias ya la incluye al elegir el agente. Alternativa descartada: casillas individuales por regla con referencia al agente por nombre — UI más compleja y casos ambiguos (¿regla de un agente no elegido?).
- **Conflictos por nombre → omitir**: importación idempotente y fusión amable ("compartir" no pisa tu mundo). Alternativas: error (rompe reimportar) o sobrescribir (pierde datos locales sin avisar).
- **Referencias por nombre, no por id**: los ids son aleatorios por sesión; los nombres ya son únicos por catálogo, que es el identificador natural entre mundos.
- **Todo-o-nada**: un archivo a mano editado con una referencia rota no deja el mundo a medias; alternativa: importar lo válido y reportar el resto.
- **UI en modo diseño** al final de la página: la historia dice "como usuario" sin modo, pero exportar/importar es gestión de contenido. Si también lo quieres en modo juego, es montar la misma sección en `PlayMode`.
