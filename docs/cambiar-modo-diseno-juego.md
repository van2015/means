## Story
Como usuario, quiero cambiar entre modo diseño y modo juego, para enfocarme en crear contenido o en jugar.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño, cuando elijo cambiar a modo juego, entonces la aplicación muestra la vista de modo juego.
- [ ] Dado que estoy en modo juego, cuando elijo cambiar a modo diseño, entonces la aplicación muestra la vista de modo diseño.

## Plan
- Añadir un estado global de modo (diseño/juego) en la aplicación.
- Crear una vista mínima de modo juego (aunque esté vacía inicialmente).
- Mostrar un control para cambiar de modo en ambas vistas.
- Cambiar entre la vista de diseño y la de juego al activar el control.
- Mantener los datos compartidos (tiendas) entre modos.

## Out of scope
- Contenido funcional del modo juego (agentes, posesión, producción, etc.).
- Ejecución de reglas automáticas.
- Exportar/importar.
- Temática visual pixel art (historia #15).

## Suggestions (your call)
- Inyectar las mismas tiendas en ambos modos para que los datos creados en diseño estén disponibles en juego.
- Considerar si el modo juego necesita sus propios presenters o puede reutilizar los existentes más adelante.
