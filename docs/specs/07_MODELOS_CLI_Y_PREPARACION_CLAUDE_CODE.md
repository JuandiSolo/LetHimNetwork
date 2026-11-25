# Fase 1 — Modelos de router, CLI y preparación de Claude Code

**Fecha:** 24 nov 2026. Inventario declarado por Gabriel: routers físicos 1–8 de la serie 2900; 9–12 de la serie 2800. El juego puede sortear cualquiera de los dos grupos y asignarles R1/R2/R3 fijos durante el lab.

## Puertos: distinguir serie, modelo y rol

La topología del PDF usa **roles lógicos** G0/0 y G0/1. En la interfaz del juego, el router físico sorteado muestra sus puertos reales, y el jugador debe escoger su comando de interfaz según el equipo (por ejemplo `interface fastethernet 0/0` si es F0/0). **Regla del juego confirmada:** físicos 9–12 usan F0/0 y F0/1, y físicos 1–8 usan G0/0 y G0/1. Es una simplificación consciente: Cisco documenta 2801/2811 con FastEthernet, pero 2821/2851 con GigabitEthernet. Las fotos futuras del modelo exacto servirán para decidir si el arte final representa fielmente cada chasis o mantiene el modelo didáctico aprobado. Mantener el mapeo de **rol en PDF ↔ interfaz real del dispositivo sorteado** en datos, nunca cambiar direcciones IP por la letra F/G. Fuentes: [Cisco 2800 Hardware View](https://www.cisco.com/web/ANZ/cpp/refguide/hview/router/2800.html), [Cisco 2911 overview](https://www.cisco.com/c/en/us/td/docs/routers/access/2900/hardware/installation/guide/Hardware_Installation_Guide/Overview.html).

## Consola aprobada

- Una sola ventana PuTTY simulada. Al mover el cable de R1 a R2 se invalida la sesión anterior; la misma ventana muestra «Conexión interrumpida», solicita Enter y entonces muestra el prompt del equipo conectado, sin reabrir otra ventana. Ningún comando llega a R1 después de desconectarlo.
- COM diferente en cada PC, sorteado al comienzo, estable todo el lab. En PuTTY solo COM es editable; Serial y demás parámetros vienen fijados según la guía. Historial ↑/↓; comandos completos; no abreviaturas ni pegado; comando fuera de catálogo: «Comando no disponible en laboratorio».
- Un router puede iniciar con configuración previa sorteada. **Siempre** ejecutar `erase startup-config` y `reload` antes de reconfigurar, incluso con prompt `Router>` o configuración vacía. `show startup-config` es opcional para inspeccionar y no condiciona la obligación.

## Evidencia antes de cerrar las salidas literales de CLI

1. Identificar modelos exactos de 9–12 y puertos visibles. Foto acercada de la placa del modelo, puertos Ethernet y consola; registrar para cada ID físico.
2. Registrar versión IOS/imagen de los modelos elegidos (`show version`) o decidir que la salida será una aproximación didáctica. La captura del PDF guía de Packet Tracer es un 2811 y no valida texto exacto de un router 2911 físico.
3. Capturar con X/Y de ejemplo y estados vacío/preconfigurado: arranque, prompt de setup, `show startup-config`, `erase startup-config`, confirmación de `reload`, `interface ...`, IP/no shutdown, `router rip`/`network`, `show ip route`, `show ip interface brief`, `ping`, errores y guardado. Guardar por comando: modo, entrada, salida completa, cambios de estado y modelo/IOS.
4. Validar con Gabriel la semántica de red, comandos y el aspecto de aulas; al recibir assets existentes, contrato de dimensiones, anclas y puertos para reemplazar mocks. Medir fluidez Chrome en MacBook M5 Pro.
5. URL/slug de GitHub Pages: preguntarla a Gabriel durante H0/deploy, como ya decidió. Claude Code lee el archivo global de Claude, este paquete y hitos; cualquier celda pendiente que bloquee un hito se pregunta antes de inventarla.

## Pendientes que requieren decisión o evidencia

- Modelos reales 9–12 aún por identificar para arte/fidelidad; la **regla jugable F** ya está aprobada.
- Resuelto: todo router requiere borrado/reload aunque arranque vacío. Pendiente: duración deseada y textos literales de arranque.
- Qué prompt se ve tras reset (`Router>` o hostname que el jugador reconfigura) y qué pasa con hostname previo en una sesión transferida.
- Rango y regla de sorteo de los dos COM diferentes; mensaje si se elige el COM del otro PC o uno inexistente.
- Catálogo exacto de comandos completos, modo permitido y respuesta, basado en la guía y capturas adicionales cuando haga falta.


## Corrección de borrado y prefijo (24 nov 2026)

**Decisión nueva:** `erase startup-config` seguido de `reload` es obligatorio para cada uno de los tres routers, aunque no exista configuración previa. `show startup-config` es un comando de solo lectura que muestra lo guardado para el siguiente arranque; ya no se necesita para decidir si toca borrar porque siempre toca. **Conflicto resuelto posteriormente por Gabriel:** en la simulación 1–8 usan GigabitEthernet G0/0/G0/1 y 9–12 FastEthernet F0/0/F0/1. Esta es una normalización del juego, no una descripción universal del hardware Cisco 2800. Los 2800 reales no comparten todos el mismo tipo de puerto; una simplificación del juego debe quedar indicada como tal.


**Preparación ya decidida:** el parser admite el prefijo G para físicos 1–8 y F para 9–12, siempre separado de rol/IP del PDF. Panel de jaula muestra A–J con 24 bocas por letra, ampliable por configuración. Fotos reales se capturan después y no bloquean H0.
