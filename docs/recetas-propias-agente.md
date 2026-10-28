## Story
Como usuario en modo diseño, quiero crear, editar y eliminar recetas propias de un agente, para definir sus métodos de producción particulares.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño y existe un agente, cuando le creo una receta válida con entradas y salidas, entonces la receta aparece entre las recetas propias de ese agente.
- [ ] Dado que estoy en modo diseño y un agente tiene recetas propias, cuando edito o elimino una de ellas, entonces el cambio se refleja en la lista de recetas del agente.
- [ ] Dado que estoy creando o editando una receta propia de un agente, cuando la dejo sin entradas, sin salidas o con cantidades inválidas, entonces veo errores de validación y no se guarda.

## Plan
- Añadir recetas propias al modelo de agente.
- Permitir seleccionar un agente y gestionar sus recetas en modo diseño.
- Reutilizar el formulario de recetas para crear y editar recetas de agente.
- Aplicar las mismas validaciones que en las recetas del catálogo general.
- Refrescar la lista de recetas del agente tras crear, editar o eliminar.

## Out of scope
- Usar recetas propias de agentes en modo juego (historia #11).
- Reglas automáticas que usen recetas propias (historia #6).
- Que el agente ejecute sus recetas propias de forma autónoma.
- Distinguir visualmente recetas del catálogo de recetas propias de agente (más allá de mostrarlas bajo el agente).

## Suggestions (your call)
- Reutilizar el mismo formulario y presentador de recetas generales para las recetas de agente, ya que la estructura es idéntica.
- Mostrar las recetas propias solo bajo el agente correspondiente, no en el catálogo general de recetas.
