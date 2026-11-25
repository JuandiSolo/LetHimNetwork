# Contrato de assets, aceptación y prevención de integración

**Estado:** contrato de assets con mocks básicos aprobados para Fase 1; detalles físicos en `05_TOPOLOGIA_FISICA_Y_ASSETS_FASE1.md`. No describe assets ya producidos ni autoriza usar fotos, logos o voces. Referencias visuales reales y permisos siguen pendientes.

## 1. Principio de integración

Primero se implementan figuras/etiquetas rudimentarias sin assets definitivos; luego el equipo de arte entrega imágenes/animaciones/sonidos con metadatos; el programador mantiene las reglas de cableado, hitboxes, zoom, estado y simulador. La identidad de puerto es estable aunque cambie el sprite. Un asset que falta se representa con placeholder y error visible en desarrollo; un asset decorativo no puede impedir que arranque el motor de red. No colocar la verdad del puerto solo dentro de un PNG ni dibujar una etiqueta ilegible que no pueda mostrarse como texto DOM.

## 2. Manifiesto requerido por pieza

| Campo | Ejemplo de forma, no valor final | Validación |
| --- | --- | --- |
| `assetId` | `router.front.r1`, `cable.direct.blue` | Único, sin dependencia de posición física |
| `sourceFile` y `format` | ruta relativa PNG/WebP/atlas | Existe, licencia registrada, carga en build |
| `width/height`, `pixelRatio` | enteros | Positivos, atlas frames coherentes |
| `anchor` | coordenada local [x,y] | Dentro de imagen y consistente con placeholders |
| `layer` | jaula, dispositivos, cables, LED, overlays | Orden explícito, hitboxes no tapadas por cables decorativos |
| `ports[]` | `{portId, x, y, hitRadius, visibleLabel}` | Cada ID existe en escenario, coordenadas dentro de pieza |
| `states[]` | apagado, link up, link down, seleccionado | Todos los estados usados por core tienen representación o fallback |
| `frames`, `fps`, `loop` | animación opcional | Fps/orden válido; `prefers-reduced-motion` alternativo |
| `license`, `credit`, `permission` | fuente y persona que autoriza | No publicar sin autorización aplicable |
| `alt`, `caption` | descripción accesible | Puerto/estado puede leerse sin mirar colores |

**Layout de la jaula:** separar foto de referencia, mapa de equipos físicos, mapa de cables fijos/patch, fondo general y acercamientos. Especificar transformaciones entre coordenadas locales del asset, mundo Phaser y pantalla de zoom; probar hitboxes con varias escalas y resolución de D-02. Cuando el artista reencuadre el sprite, debe actualizar anclas/puertos; el build detecta puertos fuera del asset o sin etiqueta.

## 3. Entregables pedidos al equipo de arte por orden

1. Fotos existentes en el documento original: jaula, routers 1–12, switches, parrilla, panel y cables; completar detalles legibles y validar con Gabriel qué es fijo, qué se asigna y qué conecta cada toma.
2. Mockup de vista general y 1 acercamiento con 48 puertos y etiquetas legibles; acuerdos sobre resolución/layer/safe area.
3. Router/switch/patch con anclas y zonas interactivas, sprites del cable suelto/completo, LEDs y estados de error.
4. Escritorio/ventana/íconos pensados para convivir con React DOM; fuentes con ñ, acentos y signos; elementos clicables no dibujados como texto no seleccionable.
5. Personajes/voz/audio y animación de feedback; metadatos y permisos; versión para movimiento reducido.

Cada entrega incluye un manifiesto versionado, licencia y comparación del render con la referencia. La sustitución de un asset provisional por uno final se acepta si no altera IDs, conexión, zoom, eventos ni resultados del Core. D-39 decide formato y frecuencia de entregas; Gabriel aprobó mocks funcionales primero; nada aquí obliga a producir todos los assets antes del H0.

## 4. Matriz de escenarios E2E para detectar defectos caros temprano

| ID | Camino real del jugador | Qué se valida además del éxito |
| --- | --- | --- |
| E-01 | Abrir URL pública en Chrome→ingresar X/Y→T1/RIPv1→quiz→jaula | Una sola instancia Phaser; direcciones y contenido del quiz correctos |
| E-02 | Recoger cable→A conectado→zoom out→otra zona→B conectado | Cabo permanece; puertos y luz corresponden al estado físico |
| E-03 | Jaula→PC→ajustar IP→volver→mover consola→PC | COM y prompt del router conectado, sin perder IP ni cableado |
| E-04 | Entrar mal el COM→corregir→abrir consola→cambiar router | Error específico; ningún comando afecta router equivocado |
| E-05 | `erase`→`reload`→configurar tres routers→RIPv1→ping PC1↔PC2 | Startup/running coherentes; rutas y feedback comparten snapshot |
| E-06 | Solución correcta, X/Y diferentes→Entregar→reintentar | Nota máxima según rúbrica; mismo motor para tabla y animación |
| E-07 | Romper enlace R1↔R3 + IP PC2 errónea→Entregar | No adjudicar certeza falsa; primer fallo y segundo factor si observable |
| E-08 | Recarga en cada pantalla con partida iniciada | Cumple decisión D-06, sin duplicar eventos, sin estado imposible |
| E-09 | Resolución mínima/navegador aprobado; teclado + ratón | Puerto accesible, textos legibles, foco en terminal, tecla Escape |
| E-10 | Sin WebGL/recurso de asset ausente/guardado corrupto | Mensaje útil, error controlado, no nota incorrecta |

**Métrica de respuesta a decidir D-36:** FPS en jaula con todos los cables, tiempo de respuesta al teclear terminal y primer render interactivo en build frío/caliente. Capturas visuales del H8 siempre comparadas con fotos, nunca solo con snapshot automatizado. El set de fixtures CLI y ping se comprueba literalmente **solo donde existe captura del hardware/version correspondiente**.

## 5. Registro preventivo de riesgos

| Riesgo observable | Prevención en spec | Prueba rápida |
| --- | --- | --- |
| “El cable desaparece al entrar al PC” | Estado físico Core, vistas solo proyectan | E-02/E-03 |
| “Se configuran comandos en otro router” | `sessionId` y `routerId` verificados por acción | E-04 |
| “Las IP del cuaderno difieren del simulador” | `AddressPlan` único | E-01 con X=1,Y=1 y X=3,Y=12 |
| “El ping muestra ruta inventada” | Trace de ida/retorno desde rutas del snapshot | E-05/E-07 |
| “Link apagado siempre significa cable malo” | Estado físico/admin/direccionamiento separado | E-07, `shutdown` con cable correcto |
| “Reintentar creó dos notas” | Submission idempotente e `attemptId` | Doble clic en Entregar |
| “Se ve bien en dev y falla en URL” | Build/deploy desde H0; verificar `base` y assets | E-01/E-09 en URL real |
| “Arte nuevo desplazó puertos” | Anclas localizadas en manifiesto + validación geométrica | Integrar un sprite revisado |
| “Cambió la librería bajo el proyecto” | Versiones exactas/lockfile y fuente v4 | Instalar/build limpio |
| “Los tests pasan pero no se puede jugar” | Pruebas desde botón, puntero y teclado reales | E-01…E-05 con Gabriel |

## 6. Entrega y revisión por hito

Para H0: URL/build, una acción UI→core→canvas y PC↔jaula, logs de instalación, pruebas X/Y iniciales. H1: validación X/Y y esquema de conexiones con placeholder. H2/H3: fixture por comando soportado, logs/rutas y pings reproducibles. H4/H5: sesión COM y cable pendiente E-02/E-04. H6/H7: narrativa, rúbrica y reintento E-01/E-07. H8/H9: foto comparada, accesibilidad, rendimiento y E2E real. En cada revisión se distingue ✅ visto/aceptado por Gabriel, 🟡 prueba o fuente, ❓ pendiente.

**Si una tarea falla dos veces:** usar el informe de atasco de `CLAUDE-GLOBAL.md`, mantener diff y evidencia, no reescribir motor/repo. Si llega evidencia que contradice la spec, registrar el caso y actualizar DEC/fixture/criterio antes de “arreglar” el código a ojo.


## Aclaración de assets de cables (24 nov 2026)

Mock y arte posterior deben permitir ver **ambos conectores** y orden de hilos: 568B–568B directo, 568A–568B cruzado, siguiendo foto enviada por Gabriel. Los cables también requieren estados conectado/no asentado/desconectado, LED de enlace físico independiente de IP y posibilidad de mover cada cable al inventario. La foto es referencia de orden y etiquetas, no autoriza copiar su imagen como asset final. Inventario sin unidades sobrantes; cantidad concreta por tipo y consola aún pendiente.


**Consola y PC:** mock de ventana PuTTY basado en la captura de la guía página 10 (solo COM editable), ventana de «Conexión interrumpida» al mover cable, terminal con prompt del router conectado y salida de arranque por verificar. Crear variantes visuales por modelo si se decide representar 2911 y serie 2800; foto del rack aún no fija los puertos de cada equipo. En Fase 1 LED de enlace físico; reservar indicador de IP como requerimiento futuro separado.


**Assets de evaluación:** diagrama de topología sobre la selección y/o cuaderno con etiquetas IP dinámicas y espacios `.30/.10/.20/.40`; Gabriel puede entregar ilustración final, y durante desarrollo se usa mock funcional. Monitor real autorizado aparece en pantalla final con texto/efectos, sin voz. Incluir variantes de puertos F/G según modelo físico confirmado. Gabriel valida arte y comandos; medición inicial Chrome/MacBook M5 Pro.


**Rango provisional de parrillas aprobado:** vistas mock A–J, bocas 1–24 por letra, creadas desde un manifiesto extensible; el arte final de cada panel se sustituye después. Para router físico 1–8 renderizar puertos G0/0/G0/1; 9–12 F0/0/F0/1 como simplificación de Fase 1.
