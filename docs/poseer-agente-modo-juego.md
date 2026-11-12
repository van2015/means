# Historia #8 — Ver agentes disponibles y poseer uno en modo juego

## Story

Como usuario en modo juego, quiero ver los agentes disponibles y poseer uno, para controlarlo.

Requires: #4

## Acceptance criteria

- [x] Dado que estoy en modo juego y existen agentes creados, cuando abro el modo juego, entonces veo la lista de agentes disponibles con su nombre.
- [x] Dado que veo la lista de agentes, cuando pulso "Poseer" en un agente, entonces ese agente queda poseído y la interfaz lo indica (p. ej. "Poseído: Panadero").
- [x] Dado que ningún agente está poseído, entonces la interfaz lo indica (p. ej. "No posees a ningún agente").
- [x] Dado que no existen agentes creados, entonces veo un mensaje de estado vacío que invita a crear agentes en modo diseño.
- [x] Dado que ya poseo un agente, cuando vuelvo a modo diseño y regreso a modo juego, entonces sigo poseiendo al mismo agente (la posesión sobrevive al cambio de modo).
- [x] Dado que intento poseer un id de agente inexistente (caso de dominio), entonces el estado de posesión no cambia y se devuelve `AGENT_NOT_FOUND`.

## Plan

1. **Dominio — estado de posesión**: crear `src/domain/possessionStore.ts` con `PossessionStore`:
   - Estado interno `possessedAgentId: string | null` (inicial `null`).
   - `possess(agentId)`: valida contra `AgentStore` que el agente exista; si no, devuelve `{ ok: false, error: 'AGENT_NOT_FOUND' }` sin cambiar estado; si existe, fija la id y devuelve `{ ok: true }`.
   - `release()`: pone la id a `null` (necesario para la historia #9; se incluye ya porque el store está vacío en este paso y es un setter de una línea).
   - `possessedAgentId()` / `possessed()`: lectura del estado (la versión `possessed()` resuelve el `Agent` por id para que la UI no tenga que cruzar datos).
   - Registrar el store en `createStores()` (`src/domain/stores.ts`) para que la posesión viva en el mismo sitio que el resto del mundo y sobreviva a los cambios de modo, siguiendo la nota de arquitectura de inyectar tiendas creadas con `createStores()`.
2. **Presentador**: crear `src/presentation/playModePresenter.ts` (`PlayModePresenter`) con el patrón `subscribe/notify` de los presenters existentes:
   - `agents` (desde `agentStore.all()`), `possessedAgentId`, `error`.
   - `possess(agentId)` → delega en el store y notifica.
   - Crear hook `src/presentation/usePlayMode.ts` que componga el presentador, espejando `useDesignMode`.
3. **UI**: reescribir `src/react/PlayMode.tsx`:
   - Mantener el `<h2>Modo juego</h2>` (lo consultan los tests de `App`).
   - Sección "Agentes disponibles": `ul` con un `li` por agente; botón "Poseer" en cada uno; la etiqueta "Poseído" (texto o `aria-pressed`) en el agente poseído.
   - Línea de estado de posesión: "Poseído: {nombre}" o "No posees a ningún agente".
   - Estado vacío cuando `agents.length === 0`.
   - Eliminar el contador provisional "Bienes registrados: N" (era un placeholder sin historia asociado).
   - Reutilizar las clases existentes de `style.css` (`section`, `ul`, `button`) para mantener la estética pixel art (#15); solo tocar CSS si hace falta una clase nueva para el indicador.
4. **Tests**:
   - `test/domain/possessionStore.test.ts`: estado inicial `null`; poseer agente válido fija la id; poseer id inexistente devuelve `AGENT_NOT_FOUND` y no cambia el estado; `release()` vuelve a `null`; poseer a otro agente sustituye la anterior (habilita #9 sin probarlo explícitamente).
   - `test/presentation/playModePresenter.test.ts`: expone los agentes del store, `possess` notifica a los suscriptores y refleja el cambio, error propagado.
   - `test/components/PlayMode.test.tsx`: render con lista, botón poseer, indicadores de poseído/vacío.
   - `test/e2e/userJourneys.test.tsx` — journey 7: crear dos agentes en modo diseño → cambiar a modo juego → ver ambos → poseer uno → indicador correcto → volver a diseño y regresar → la posesión persiste.
   - **Actualizar** `test/components/App.test.tsx` (test "shares the same stores between modes"): deja de poder afirmar `bienes registrados: 2` al eliminarse el placeholder; pasar a afirmar el estado compartido con los agentes creados.
5. **Documentación**: marcar `#8` como completado en `docs/backlog.md`.

## Out of scope

- Cambiar de agente poseído o dejar de poseer ninguno desde la UI (historia #9). El dominio lo soportará (`possess`/`release`) pero la UI de #8 deshabilita el botón "Poseer" de los demás agentes mientras hay uno poseído para no adelantar #9.
- Ver inventario y recetas del agente poseído (historia #10).
- Cambiar prioridad de reglas del agente poseído (historia #11).
- Producir con recetas y ejecutar reglas automáticas (historias #12 y #13).
- Exportar/importar (historia #14).
- Borrado de agentes (no hay historia; si existiera, habría que definir qué pasa con la posesión del agente borrado).

## Suggestions (your call)

- **Dónde vive la posesión**: asumido un `PossessionStore` dentro de `createStores()` (consistente con la arquitectura e inyectable). Alternativa descartada: estado `useState` en `App.tsx`, que sería más difícil de reutilizar en el bucle de juego de #13.
- **Botón "Poseer" mientras ya hay poseído**: planificado deshabilitado para separar limpiamente #8 de #9. Si prefieres que pulsar otro agente cambie directamente la posesión (y así #9 solo añada "Dejar de poseer"), es un cambio de una línea en `PlayMode.tsx`.
- El texto exacto de los indicadores ("Poseído: X", mensaje vacío) es negociable; los tests usarán expresiones regulares tolerantes.
