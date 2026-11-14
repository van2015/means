# Agentes como autómata celular (nota de investigación)

## Contexto

Investigación mental pedida el 2026-11-15, sin tocar código. Parte de la pregunta: los agentes ya actúan según una tabla de prioridad, ¿podría hacerse un similar con el juego de la vida de Conway, y visualizar los agentes como un autómata celular?

Conclusión corta: **sí, por dos vías** — una visual (rejilla + generaciones, sin tocar el motor) y una mecánica (vecindad + actualización sincrónica, que sí exige cambios en el dominio). Y un matiz conceptual: el modelo actual no es un autómata _celular_, es un conjunto de **autómatas con función de transición propia**; lo que falta para que el conjunto sea celular es la vecindad.

## 1. El modelo actual ya es un autómata (aunque no celular)

Lo que hace cada agente en `runAutomaticRules` es exactamente:

```
f_i(inventario) = primera regla cuya condición se cumple, aplicada al inventario
```

La tabla de prioridad **es** la definición de la función de transición del agente, escrita como lista de decisión (condición → acción, ordenada por prioridad). Detalles del motor que sostienen la analogía:

- `applicableRules(agent)` filtra las reglas cuya condición se cumple; `replaceRules` mantiene la lista ordenada por prioridad, así que la cascada es determinista.
- `runNextRule` recorre esa cascada: si la regla de mayor prioridad no puede ejecutarse (sin materiales, receta borrada), prueba la siguiente. Es resolución de conflictos al estilo _classifier system_ (Holland).
- `recipesPerAction` son sub-ciclos de actualización dentro de una misma generación.
- El agente poseído queda excluido: es la celda "pulsada a mano" por el jugador.
- `tick()` (estrategia TEMPORAL, 1 s) y `advance()` (POR_ACCIONES) son la generación y el botón _step_; con POR_ACCIONES el reloj es el jugador.
- La transición es **determinista**: `generateId` usa `Math.random()`, pero los IDs son solo etiquetas; la lógica no depende de ellos. Dado el mismo estado y el mismo orden de agentes (orden de creación), la generación siguiente es siempre la misma.

Lo que hace falta para que sea un autómata _celular_ de verdad: **vecindad** y **actualización sincrónica**.

## 2. Tabla de correspondencias

| Means                                  | Autómata celular                          | Estado actual                                |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `tick()` / `Avanzar`                   | generación / botón _step_                 | ✅ existe                                    |
| `POR_ACCIONES`                         | CA con reloj externo (stepping manual)    | ✅ existe                                    |
| agente                                 | celda                                     | ✅ (sin coordenadas)                         |
| inventario                             | estado de la celda                        | ⚠️ multi-bien: hay que cuantizar para pintar |
| tabla de prioridades                   | función de transición `f` (una por celda) | ✅ existe                                    |
| cascada `applicableRules`              | resolución de conflictos                  | ✅ existe                                    |
| `recipesPerAction`                     | sub-ciclos por generación                 | ✅ existe                                    |
| agente poseído                         | celda controlada por el jugador           | ✅ existe                                    |
| eventos `{agentId, ruleId}` por tick   | traza de transiciones de la generación    | ✅ ya los devuelve                           |
| —                                      | **vecindad / comercio entre celdas**      | ❌ no existe                                 |
| actualización secuencial con relectura | sincrónica (leer todo → escribir todo)    | ❌ no existe                                 |

## 3. Dónde rompe la analogía

1. **Estado**: Conway es binario; aquí el estado es un vector de enteros (un bien por cantidad). Para pintar hay que cuantizar (ver N1).
2. **Vecindad**: `produce()` solo toca el inventario propio del agente. Durante la simulación **los agentes no se afectan entre sí** (los catálogos de bienes/recetas son de solo lectura en modo juego). Sin interacción, una rejilla sería estéticamente un CA pero estructuralmente no lo es. Esta es la pieza que falta de verdad.
3. **Sincronía**: `runAutomaticRules` actualiza en secuencia y relee el agente en cada sub-ciclo. Hoy el orden de iteración no cambia el resultado porque los agentes son independientes; en cuanto haya comercio vecinal, sí lo cambiaría → haría falta el modelo de dos fases (leer todo, escribir todo) que usan los CA.
4. **Uniformidad**: en Conway una sola regla para todas las celdas; aquí cada agente tiene la suya. Es un "CA con genética por celda" (válido, existe en la literatura), pero significa que los patrones clásicos (gliders, still lifes) no están garantizados: dependen de que las tablas de los vecinos sean compatibles.

## 4. Tres niveles de experimento

### N1 — Visualizador puro (solo presentación, no toca `domain`)

Rejilla de agentes, cada `tick` es una generación. Por celda:

- **color** = bien con mayor cantidad (gris si el inventario está vacío)
- **brillo/opacidad** = inventario total
- **anillo** = número de reglas aplicables ahora mismo
- **destello** en la generación en la que disparó (los eventos `{agentId, ruleId}` ya llegan)
- **marca especial** en el agente poseído

Y el detalle con más valor, el **rastro de la cascada de prioridades** para la celda seleccionada (el equivalente al _rule trace_ de un depurador de CA):

```
[Panadero]  generación 42
  10  harina ≥ 2  → horneado    ✓ disparada
   5  pan ≥ 3     → venta       ✗ sin materiales
   1  todo ≥ 1    → reciclar    · condición falsa
```

**Hueco actual:** `runAutomaticRules` solo devuelve los **éxitos**; `runNextRule` descarta los fallos en silencio. Para el rastro haría falta un hook de observabilidad que exponga también los intentos fallidos (y opcionalmente las reglas descartadas por condición). Es el cambio habilitante de N1 y N3.

También haría falta un **contador de generación** (hoy `tick()` devuelve solo el número de producciones ejecutadas) y decidir de dónde salen las coordenadas (puede asignarlas el layout en presentación, sin persistirlas).

### N2 — Modo autómata de verdad

- Coordenadas `(x, y)` del agente (¿en el dominio o solo en presentación? ver decisiones abiertas).
- Transferencias de bienes entre vecinos: `produce` deja de ser el único mecanismo de cambio de estado.
- Actualización **sincrónica** en dos fases para que el resultado no dependa del orden de iteración.

Con eso ya se puede preguntar cosas de CA: ¿hay _still lifes_ (inventario en punto fijo)? ¿_osciladores_ (boom-bust de periodo 2)? ¿_gliders_ (una receta empujando un bien a lo largo de una cadena de agentes)?

### N3 — Analítica sin pintar nada

Con el log `(generación, agente, regla)` se detectan esos mismos patrones por código. Es lo que de verdad responde a "¿mi economía es interesante o se queda en un punto fijo?", y no requiere el visualizador.

## 5. Decisiones abiertas

1. **¿Dónde viven las coordenadas?** Si van en el dominio (`Agent`), viajan en el JSON de export/import (#14) y hay que decidir si son parte del mundo o solo presentación. Si son solo presentación, cada sesión tendría que recolocar los agentes.
2. **Cuantización del color**: bien dominante (simple, se pierde la diversidad) vs. valor total con precios (requiere precios, que hoy no existen).
3. **¿Se expone el hook de intentos fallidos en el dominio o se deriva en presentación?** Lo primero es más honesto y reutilizable; lo segundo no toca `domain`.
4. **Orden de actualización**: si algún día hay comercio vecinal, decidir entre sincrónico (CA puro, reproducible) o secuencial con orden aleatorio por generación (más "vivo", pero depende del azar).
5. **Estética**: el backlog ya tiene la story #15 de pixel art retro; una rejilla de celdas encaja bien con esa estética (es literalmente un tilemap).

## 6. Fuera de alcance de este documento

- Cambiar el motor de producción, las prioridades o la validación de reglas.
- Añadir comercio o coordenadas al dominio (eso sería N2 y tendría su propia story).
- Elegir librería de renderizado para N1.

## 7. Referencias

- **Sistemas de clasificación / classifier systems** (Holland): tablas de reglas condición→acción con un mecanismo de resolución de conflictos. Es el formalismo más cercano al modelo actual.
- **Listas de decisión** (Rivest): la tabla de prioridad ordenada es una lista de decisión.
- **Modelo de segregación de Schelling**: agentes en rejilla con regla local → emergencia macroscópica. Es el puente clásico entre "agentes" y "autómata celular", y la justificación para introducir vecindad (N2).
- **Juego de la vida** (Conway): el referente de visualización y de patrones emergentes (still life, oscillator, glider).
