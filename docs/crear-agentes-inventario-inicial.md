## Story
Como usuario en modo diseño, quiero crear agentes y asignarles un inventario inicial, para modelar actores en la economía.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño, cuando creo un agente con nombre y un inventario inicial compuesto por bienes/servicios del catálogo con cantidades, entonces el agente aparece en la lista de agentes.
- [ ] Dado que estoy creando un agente, cuando dejo el nombre vacío o uso cantidades menores o iguales a cero, entonces veo errores de validación y el agente no se crea.
- [ ] Dado que estoy en modo diseño y existen agentes, cuando consulto la lista de agentes, entonces veo el nombre y el inventario inicial de cada uno.

## Plan
- Añadir el concepto de agente con nombre e inventario al dominio.
- Permitir crear agentes desde el modo diseño con nombre y líneas de inventario.
- Validar que el nombre no esté vacío y que las cantidades sean positivas.
- Mostrar la lista de agentes creados con su inventario inicial.
- Refrescar la lista tras crear un agente.

## Out of scope
- Editar o eliminar agentes.
- Recetas propias de agentes (historia #5).
- Reglas automáticas (historia #6).
- Modo juego: poseer agentes, producir, cambiar de agente.
- Distinguir visualmente bienes de servicios en el inventario.

## Suggestions (your call)
- Reutilizar el componente de línea de receta para seleccionar bien y cantidad en el inventario inicial, ya que la interacción es idéntica.
