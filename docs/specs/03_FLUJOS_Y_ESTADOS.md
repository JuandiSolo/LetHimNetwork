# Contrato de flujo y estado de partida — propuesta

**Estado:** borrador con decisiones confirmadas de Gabriel registradas en documento 05; demás D-xx pendientes. Las transiciones son verificables; cualquier regla con D-xx pendiente es una alternativa, no una decisión de Gabriel. Phaser 4 dibuja la jaula; React presenta escritorio y terminal según D-04. Un `AppController` común es dueño de la partida.

## 1. Estado canónico

```ts
type SessionState = {
  schemaVersion: number; scenarioVersion: string; seed: number;
  sectionX: number; groupY: number; addressPlan: AddressPlan;
  currentScreen: 'home'|'topology'|'quiz'|'tools'|'lab'|'desktop'|'feedback';
  selectedPcId?: 'PC-1'|'PC-2';
  physical: {devices: DeviceState[]; cables: CableState[]; pendingCableId?: string};
  serial: {pcId?: string; routerId?: string; comPort?: string; openSessionId?: string};
  pcs: Record<string, PcConfig>;
  routers: Record<string, RouterConfig>;
  clockTick: number; attempt: number; submissions: GradeResult[];
  ui: {labCamera?: CameraSnapshot; selectedPortId?: string; notebookOpen?: boolean};
};
```

IDs, IP y configuraciones viven en Core. Phaser proyecta objetos y eventos, no guarda una copia autoritativa del cableado; React edita a través de acciones. `GameState` permanece solo en memoria durante Fase 1: recargar/cerrar pierde partida, con aviso de navegación según soporte del navegador. Guardado y migraciones se documentan como futuro. Los `GameAction` usan IDs estables y resultados con códigos localizables. `Math.random()` y reloj real no determinan fallos de red.

## 2. Entrada X/Y y pantallas

- `HOME`: nombre según D-35, formulario «sección X» y «grupo Y». Confirmar valida todos los octetos, muestra IP calculadas y crea partida T1. Un error no permite seguir ni altera una partida previa. Gabriel decidió que X/Y quedan fijos en la partida; cambiarlos inicia un laboratorio nuevo. Mostrar IP antes y en libreta.
- `TOPOLOGY`: T1 IPv4 habilitada; otras bloqueadas con etiqueta. RIPv1 es único protocolo activo, no simular selector que ofrezca OSPF en esta fase.
- `QUIZ`: tres preguntas seleccionadas de un banco variable de al menos tres (previstas unas 5–10); repetir hasta acertar las tres para desbloquear **jaula y cuaderno**. El quiz no influye en nota.
- `TOOLS`: reunir/clasificar según D-13/14; progreso/inventario no se duplica al visitar otra pantalla.
- `LAB`: jaula Phaser con zoom, puertos, cable seleccionado/pendiente; cuaderno visible mediante control explícito según D-31; visita PC según D-10.
- `DESKTOP`: interfaz React con ajustes IP, administrador de dispositivos, terminal PuTTY simulada y consola PC/ping según D-22; regreso a jaula sin destruir configuración.
- `FEEDBACK`: al pulsar Entregar desde la página del cuaderno, snapshot inmediato, monitor textual con nota, bloqueo principal y sección de otros errores. Try again inicia desde cero; no conserva estado.

**Puertas importantes:** entrar al PC puede permitirse aun sin cables, pero terminal serial indica claramente por qué no abre; la app de IP debe poder abrirse sin COM. Enviar antes de tener red genera feedback útil, no crash. Comandos PC/router no ejecutan acciones de otra pantalla salvo la sesión serial autorizada.

## 3. Ciclo del cable de datos

| Estado | Acción | Resultado/alternativa a confirmar |
| --- | --- | --- |
| En inventario | Elegir unidad | Resaltar tipo, sin consumir todavía |
| Seleccionado | Elegir puerto A válido | Cable con A conectado y B pendiente, puerto A ocupado |
| Seleccionado | Elegir puerto ocupado/inválido | Error estable de puerto; no consume inventario |
| A conectado | Cambiar zoom/zona/ir al PC | El estado pendiente sigue en Core; mostrar aviso visible al volver |
| A conectado | Elegir puerto B válido | Cable completo, evaluar tipo y asiento; el LED refleja enlace físico y no IP/RIPv1 |
| A conectado | Esc/cancelar | Regla D-15: libera A y recupera unidad o deja cabo pendiente, nunca cable invisible |
| Completo | Seleccionar/desconectar | Siempre permitido; libera puertos y la unidad puede volver al inventario; recalcular rutas y sesión si corresponde |

El dibujo de cable colgante y el color son proyecciones de su ID. No suponer que cable sin luz significa “mal enchufado”: puede deberse a `shutdown`, equipo sin alimentación (si futuro), tipo inválido D-11, puerto equivocado o falta de asiento D-12. Tooltip debe mostrar causa comprobada o “pendiente de diagnóstico”.

## 4. Ciclo de cable de consola y dos vistas

1. En jaula se conecta un extremo del cable de consola al puerto CONSOLE de R1/R2/R3, y el extremo PC al adaptador/puerto según Q-01 y D-10. El cable no transporta ping.
2. Al abrir escritorio, administrador de dispositivos indica COM real simulado solo si conexión está completa. PuTTY solicita COM/serial settings y crea sesión para **routerId capturado en la apertura**.
3. `DISPLAY_ROUTER_PROMPT` lee el estado del router; `WRITE_COMMAND` siempre lleva `sessionId` y `routerId`, se rechaza si la conexión ya no coincide.
4. Al desconectar/mover el cable desde jaula se cierra/invalida la sesión anterior. Mostrar «Conexión interrumpida»; con el nuevo enlace a R2, Enter muestra su consola. El estado de R1 sigue en R1. Queda por concretar si la ventana nueva aparece automáticamente y el prompt de router borrado versus `R2>`.
5. El PC conserva su IP a través de estas idas/vueltas. Hay dos puestos físicos asignados que se configuran individualmente. Cada PC recibe COM propio, distinto del otro, aleatorio al crear la partida y fijo en esa partida. Una implementación visual puede renderizar ambos escritorios, conservando identidad; el juego asigna R1/R2/R3 y un switch común.

**E2E mínimo:** abrir R1, cambiar hostname, volver a jaula, mover cable, abrir R2, teclear `show running-config`, volver a R1; confirmar que ambos routers muestran lo suyo. Hacer lo mismo con un cable de datos colgante para comprobar que no desaparece.

## 5. Desconexiones, reintentos y recarga

| Evento | Resultado base propuesto | Decisión pendiente |
| --- | --- | --- |
| Se pierde COM durante tecleo | Rechazar comando y conservar texto local como borrador; no aplicarlo a otro router | D-17/19 |
| Se cambia de vista durante `reload` | Reloj virtual continúa o se pausa según política explícita; al volver mostrar progreso coherente | D-20 |
| Se pulsa Entregar dos veces | Primera solicitud congela snapshot; segunda no crea dos notas | D-28 |
| Desconectar durante animación de ping | Animación sigue snapshot evaluado o se cancela; nunca mezcla topología nueva con trace viejo | D-28/32 |
| Try again | Nueva partida desde inicio, X/Y iguales; sortear nuevos equipos, switch y COM; reiniciar quiz, cables, configs y nota | D-29 ✅ |
| F5 en PC/jaula/feedback | Solicitar confirmación genérica del navegador tras interacción; si acepta recargar, perder toda la partida y volver al inicio | Aprobado por Gabriel; comprobar Chrome |
| Guardado corrupto/versión vieja | No aplica a Fase 1 sin guardado; documentado para futuro | Futuro |
| Cambiar X/Y a mitad | La partida actual mantiene sus valores; para cambiarlos iniciar un laboratorio nuevo | Aprobado por Gabriel |

## 6. Qué obliga a una prueba humana

- Hitbox de puertos en zoom y zoom out; cable pendiente visible al pasar de zona.
- Foco de teclado: abrir consola, teclear `?`, cerrar y que Phaser no capture lo escrito.
- Narración y pistas suficientemente claras sin tutorial.
- Regreso jaula↔PC sin parpadeo, duplicación de canvas ni pérdida de estado.
- Resumen textual equivalente para quien no pueda interpretar el ping animado.

**Errores que esta spec previene:** dos instancias de Phaser en React StrictMode, listeners duplicados tras dormir/despertar escenas, ID de puerto creado dos veces, comando enviado al router anterior, ping renderizado con estado más nuevo que el snapshot, pérdida de cabo libre al abrir escritorio, notas duplicadas por doble clic y saves inválidos que aparentan éxito.


## Decisiones nuevas de interacción física

Cualquier toma libre de parrilla del PC empareja únicamente la misma etiqueta de salida en jaula. Todo cable se puede sacar y recolocar, y el inventario conserva el número exacto de unidades. El tipo de cable se infiere mirando ambos extremos (568B–568B directo, 568A–568B cruzado). Entre equipos de distinto tipo se exige directo; entre dos routers se exige cruzado. Un tipo equivocado o un conector mal asentado mantiene LED físico apagado incluso si la IP es correcta. La IP errónea puede dejar LED encendido y ping fallido. Se permite retirar y volver a conectar un conector no asentado; probabilidad y penalización permanecen abiertas.


**PuTTY de Fase 1:** ventana inspirada en guía PDF página 10; Serial, velocidad 9600 y demás ajustes predefinidos, solo COM editable entre campos. Historial arriba/abajo, comandos completos, pegar deshabilitado. Comando no soportado → «Comando no disponible en laboratorio», sin mutación. Asiento de conector puede fallar con probabilidad `2 %` por conexión (`0,02`); reconectar no penaliza. La nota se calcula al entregar, sin penalización por pruebas.


**Fase 1 definitiva de flujo:** no hay pistas aparte del cuaderno. Presentar topología con IP por X/Y; tres preguntas correctas, repetibles sin nota, habilitan jaula y cuaderno. Ping manual disponible; Entregar desde página del cuaderno en cualquier momento del lab, sin reloj de convergencia. Monitor informa resultado en texto/sonidos; Try again reconstruye toda la partida desde el inicio. Mantener estado de ida y respuesta del ping independientes.


**Aclaración de puertas:** pantalla inicial pide X/Y una sola vez; tras quiz aprobado se habilitan jaula, cuaderno y página Entregar. Try again conserva X/Y sin volver a solicitarlos, pero repite quiz y sortea equipo/switch/COM nuevos. En cada router se exige borrado y reload antes de reconfigurar, incluso si empezó vacío.
