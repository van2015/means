## Story
Como usuario en modo diseño, quiero configurar reglas automáticas de producción/consumo para los agentes, para que actúen de forma autónoma.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño y existe un agente, cuando le añado una regla automática que asocia una receta con una condición y una prioridad, entonces la regla aparece en la lista ordenada de reglas del agente.
- [ ] Dado que estoy configurando una regla, cuando intento guardarla sin seleccionar receta o sin definir condición, entonces veo errores de validación y no se guarda.
- [ ] Dado que estoy en modo diseño y un agente tiene reglas automáticas, cuando edito o elimino una regla, entonces los cambios se reflejan en su lista ordenada.

## Plan
- Añadir reglas automáticas al modelo de agente (receta, condición, prioridad).
- Permitir seleccionar un agente y gestionar sus reglas en modo diseño.
- Soportar reglas que usen recetas del catálogo general o recetas propias del agente.
- Validar que una regla tenga receta y condición definidas.
- Ordenar las reglas por prioridad y refrescar la lista tras crear, editar o eliminar.

## Out of scope
- Ejecutar las reglas automáticamente (historia #12).
- Condiciones complejas (más allá de una condición simple de inventario).
- Modo juego.
- Crear recetas, agentes o bienes (ya existen).

## Suggestions (your call)
- Modelar la condición de forma mínima como "el agente tiene al menos/menos de N unidades de un bien", que cubre los casos de producción y consumo básicos.
- Mostrar recetas del catálogo general y del agente en dos grupos al seleccionar la receta de una regla.
