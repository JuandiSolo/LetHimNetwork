/**
 * CLI Execution Engine - Pure functions for CLI simulation.
 * Takes state + routerId + selected option -> returns new state + output lines.
 */

import type {
  RouterId,
  ExecMode,
  RouterState,
  RouterConfig,
  TerminalSession,
  CliMenuOption,
  ValueListItem,
  GameState,
  PhysicalAssignment,
} from './types';
import { buildMenuOptions, getValueList, getConfiguredNetworks, getShowTypes, createEmptyRouterConfig, createInitialRouterState } from './cliMenu';

// ==================== CONFIG TEXT GENERATION ====================

/**
 * Generates IOS-like running-config text from RouterConfig.
 */
export function deriveConfigText(config: RouterConfig): string[] {
  const lines: string[] = [];
  lines.push(`Building configuration...`);
  lines.push(`Current configuration : ${JSON.stringify(config).length} bytes`);
  lines.push(`!`);
  lines.push(`version 15.2`);
  lines.push(`service timestamps debug datetime msec`);
  lines.push(`service timestamps log datetime msec`);
  lines.push(`!`);
  lines.push(`hostname ${config.hostname}`);
  lines.push(`!`);
  lines.push(`no ip domain lookup`);
  lines.push(`!`);

  // Interfaces
  for (const [name, iface] of Object.entries(config.interfaces)) {
    lines.push(`!`);
    lines.push(`interface ${name}`);
    if (iface.ip && iface.mask) {
      lines.push(` ip address ${iface.ip} ${iface.mask}`);
    }
    if (iface.shutdown) {
      lines.push(` shutdown`);
    } else {
      lines.push(` no shutdown`);
    }
  }

  // RIP
  if (config.rip.enabled && config.rip.networks.length > 0) {
    lines.push(`!`);
    lines.push(`router rip`);
    if (config.rip.version) {
      lines.push(` version ${config.rip.version}`);
    }
    for (const net of config.rip.networks) {
      lines.push(` network ${net}`);
    }
  }

  lines.push(`!`);
  lines.push(`line con 0`);
  lines.push(` logging synchronous`);
  lines.push(`line vty 0 4`);
  lines.push(` login`);
  lines.push(`!`);
  lines.push(`end`);

  return lines;
}

/**
 * Generates startup-config text (same format as running-config).
 */
export function deriveStartupConfigText(config: RouterConfig | null): string[] {
  if (!config) {
    return ['startup-config is not present'];
  }
  return deriveConfigText(config);
}

/**
 * Generates "show ip interface brief" output.
 */
export function deriveIpInterfaceBrief(config: RouterConfig, routerRole: RouterId): string[] {
  const lines: string[] = [];
  lines.push('Interface                  IP-Address      OK? Method Status                Protocol');
  for (const [name, iface] of Object.entries(config.interfaces)) {
    const ip = iface.ip ? `${iface.ip}/${cidrFromMask(iface.mask)}` : 'unassigned';
    const status = iface.shutdown ? 'administratively down' : 'up';
    const protocol = iface.shutdown ? 'down' : 'up';
    lines.push(`${padEnd(name, 24)} ${padEnd(ip, 15)} YES manual ${padEnd(status, 20)} ${protocol}`);
  }
  return lines;
}

/**
 * Generates "show ip route" output (connected routes only for H2).
 */
export function deriveIpRoute(config: RouterConfig, routerRole: RouterId): string[] {
  const lines: string[] = [];
  lines.push('Codes: L - local, C - connected, S - static, R - RIP');
  lines.push('       M - mobile, B - BGP, D - EIGRP, EX - EIGRP external');
  lines.push('       O - OSPF, IA - OSPF inter area, N1 - OSPF NSSA external');
  lines.push('       E1 - OSPF external type 1, E2 - OSPF external type 2');
  lines.push('');

  for (const [name, iface] of Object.entries(config.interfaces)) {
    if (iface.ip && iface.mask && !iface.shutdown) {
      const network = getNetworkAddress(iface.ip, iface.mask);
      lines.push(`C    ${network}/${cidrFromMask(iface.mask)} is directly connected, ${name}`);
      lines.push(`L    ${iface.ip}/32 is directly connected, ${name}`);
    }
  }

  // RIP routes would be added in H3
  if (config.rip.enabled && config.rip.networks.length > 0) {
    lines.push('');
    lines.push('RIP routes not simulated in H2 (see H3)');
  }

  return lines;
}

// ==================== HELPER FUNCTIONS ====================

function cidrFromMask(mask: string | null): number {
  if (!mask) return 0;
  const parts = mask.split('.').map(Number);
  return parts.reduce((sum, octet) => sum + octet.toString(2).split('1').length - 1, 0);
}

function getNetworkAddress(ip: string, mask: string): string {
  const ipParts = ip.split('.').map(Number);
  const maskParts = mask.split('.').map(Number);
  return ipParts.map((octet, i) => octet & maskParts[i]).join('.');
}

function padEnd(str: string, len: number): string {
  return str.padEnd(len, ' ');
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ==================== CLI EXECUTION ====================

export interface CliExecutionResult {
  newRouterState: RouterState;
  newSession: TerminalSession;
  outputLines: string[];
  awaitingValueSelect?: { valueType: 'ip-address' | 'mask' | 'network' | 'ping-dest'; firstValue?: string; commandTemplate: string };
  awaitingConfirm?: 'erase' | 'reload';
  sessionClosed?: boolean;
}

/**
 * Main CLI execution function.
 * Pure: given current router state, session, and selected option ID, returns new state and output.
 */
export function executeCliOption(
  routerId: RouterId,
  routerState: RouterState,
  session: TerminalSession,
  optionId: string,
  physicalAssignment: PhysicalAssignment,
  addressPlan: any, // AddressPlan
  providedValue?: string, // For value selectors (ip, mask, network, ping)
  secondValue?: string    // For ip address (mask)
): CliExecutionResult {
  const mode = session.mode;
  const menuOptions = buildMenuOptions(mode, routerId, physicalAssignment);
  const option = menuOptions.find(o => o.id === optionId);

  if (!option) {
    return {
      newRouterState: routerState,
      newSession: session,
      outputLines: [`% Comando no disponible en laboratorio`],
    };
  }

  const newRouterState = deepClone(routerState);
  const newSession = deepClone(session);
  const outputLines: string[] = [];

  // Handle pending confirmations first
  if (session.pendingConfirm) {
    if (optionId === 'confirm') {
      return handleConfirm(routerId, newRouterState, newSession, outputLines, physicalAssignment);
    } else if (optionId === 'cancel') {
      newSession.pendingConfirm = undefined;
      outputLines.push('Operación cancelada.');
      return { newRouterState, newSession, outputLines };
    } else {
      return {
        newRouterState,
        newSession,
        outputLines: ['% Confirme o cancele la operación pendiente'],
        awaitingConfirm: session.pendingConfirm,
      };
    }
  }

  // Handle awaitingEnter (after "Conexión interrumpida" or "Sesión cerrada")
  if (session.awaitingEnter) {
    newSession.awaitingEnter = false;
    // Re-execute the same option after Enter
    return executeCliOption(routerId, newRouterState, newSession, optionId, physicalAssignment, addressPlan, providedValue, secondValue);
  }

  // Handle value selection (second step for ip address: mask)
  if (session.interfaceContext && optionId === 'mask-selected' && providedValue) {
    return handleIpAddressMask(routerId, newRouterState, newSession, outputLines, session.interfaceContext, providedValue);
  }

  // Execute the option
  switch (option.action) {
    case 'transition':
      return handleTransition(option, newRouterState, newSession, outputLines);

    case 'execute':
      return handleExecute(option, routerId, newRouterState, newSession, outputLines, addressPlan, physicalAssignment);

    case 'value-select':
      return handleValueSelect(option, newRouterState, newSession, outputLines, addressPlan);

    case 'show':
      // Handled by subMenu selection
      return { newRouterState, newSession, outputLines: ['% Seleccione un tipo de show'] };

    case 'help':
      return handleHelp(option, mode, newSession, outputLines);

    case 'exit-session':
      return handleExitSession(newRouterState, newSession, outputLines);

    default:
      return { newRouterState, newSession, outputLines: ['% Opción no implementada'] };
  }
}

function handleTransition(
  option: CliMenuOption,
  routerState: RouterState,
  session: TerminalSession,
  output: string[]
): CliExecutionResult {
  if (option.targetMode) {
    session.mode = option.targetMode;
    // Clear interface context when leaving config-if
    if (session.mode !== 'config-if') {
      session.interfaceContext = undefined;
    }
  }
  if (option.generatesCommand) {
    output.push(`${getPrompt(routerState.running.hostname, session.mode)}${option.generatesCommand}`);
  }
  return { newRouterState: routerState, newSession: session, outputLines: output };
}

function handleExecute(
  option: CliMenuOption,
  routerId: RouterId,
  routerState: RouterState,
  session: TerminalSession,
  output: string[],
  addressPlan: any,
  physicalAssignment: PhysicalAssignment
): CliExecutionResult {
  const cmd = option.generatesCommand || '';
  output.push(`${getPrompt(routerState.running.hostname, session.mode)}${cmd}`);

  switch (option.id) {
    case 'copy-run-start':
      routerState.startup = deepClone(routerState.running);
      output.push('Destination filename [startup-config]?');
      output.push('Building configuration...');
      output.push('[OK]');
      break;

    case 'erase-start':
      routerState.startup = null;
      routerState.erasedSinceBoot = true;
      output.push('Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]');
      output.push('[OK]');
      break;

    case 'reload':
      if (routerState.startup) {
        routerState.running = deepClone(routerState.startup);
      } else {
        // Empty config - reset to defaults
        const { wan, lan } = getInterfaceNamesForRole(routerId, physicalAssignment);
        const hasLoopback = routerId === 'R2' || routerId === 'R3';
        const loopbackNum = routerId === 'R2' ? '2' : '3';

        const interfaces: Record<string, any> = {
          [wan]: { ip: null, mask: null, shutdown: true },
          [lan]: { ip: null, mask: null, shutdown: true },
        };
        if (hasLoopback) {
          interfaces[`loopback ${loopbackNum}`] = { ip: null, mask: null, shutdown: false };
        }

        routerState.running = {
          hostname: routerState.running.hostname,
          interfaces,
          rip: { enabled: false, version: null, networks: [] },
        };
      }
      routerState.eraseReloadDone = routerState.erasedSinceBoot;
      routerState.erasedSinceBoot = false;
      session.mode = 'user';
      session.interfaceContext = undefined;

      // Boot messages
      output.push('System Bootstrap, Version 15.2, RELEASE SOFTWARE');
      output.push('Copyright (c) 1999-2020 by Cisco Systems, Inc.');
      output.push('Compiled Wed 15-Apr-20 12:34 by prod_rel_team');
      output.push('');
      output.push('Restricted Rights Legend');
      output.push('Use, duplication, or disclosure by the Government is');
      output.push('subject to restrictions as set forth in subparagraph');
      output.push('(c) of the Commercial Computer Software - Restricted');
      output.push('Rights clause at FAR sec. 52.227-19 and subparagraph');
      output.push('(c) (1) (ii) of the Rights in Technical Data and Computer');
      output.push('Software clause at DFARS sec. 252.227-7013.');
      output.push('');
      output.push(`${routerState.running.hostname} uptime is 0 minutes`);
      output.push('System returned to ROM by reload');
      output.push('System restarted at 00:00:00 UTC Mon Jan 1 2024');
      output.push('');
      output.push('Press RETURN to get started!');
      break;

    case 'shutdown':
      if (session.interfaceContext && routerState.running.interfaces[session.interfaceContext]) {
        routerState.running.interfaces[session.interfaceContext].shutdown = true;
      }
      break;

    case 'no-shutdown':
      if (session.interfaceContext && routerState.running.interfaces[session.interfaceContext]) {
        routerState.running.interfaces[session.interfaceContext].shutdown = false;
      }
      break;

    case 'version-1':
      routerState.running.rip.version = 1;
      routerState.running.rip.enabled = true;
      break;

    case 'network':
    case 'no-network':
      // These are handled via value-select, not direct execute
      break;

    default:
      output.push('% Comando ejecutado (simulado)');
  }

  return { newRouterState: routerState, newSession: session, outputLines: output };
}

function handleValueSelect(
  option: CliMenuOption,
  routerState: RouterState,
  session: TerminalSession,
  output: string[],
  addressPlan: any
): CliExecutionResult {
  if (!option.valueType || option.valueType === 'show-type') {
    return { newRouterState: routerState, newSession: session, outputLines: [...output, '% Seleccione un tipo de show'] };
  }

  let items: any[] = [];
  switch (option.valueType) {
    case 'ip-address':
      items = getValueList('ip-address', addressPlan);
      break;
    case 'network':
      items = getValueList('network', addressPlan);
      break;
    case 'ping-dest':
      items = getValueList('ping-dest', addressPlan);
      break;
    case 'mask':
      items = getValueList('mask', addressPlan);
      break;
  }

  if (option.id === 'no-network' && session.mode === 'config-router') {
    items = getConfiguredNetworks(routerState.running);
  }

  // Add Cancel option
  items = [...items, { value: 'CANCEL', label: 'Cancelar', description: 'Volver al menú' }];

  return {
    newRouterState: routerState,
    newSession: session,
    outputLines: output,
    awaitingValueSelect: {
      valueType: option.valueType,
      commandTemplate: option.generatesCommand || '',
    },
  };
}

function handleHelp(option: CliMenuOption, mode: ExecMode, session: TerminalSession, output: string[]): CliExecutionResult {
  if (option.id === 'help') {
    output.push('CLI Simulado - Guía rápida:');
    output.push('  - Use los botones para navegar por los modos');
    output.push('  - Cada botón ejecuta el comando IOS equivalente');
    output.push('  - No se requiere tipear; los errores son solo semánticos');
    output.push('  - "enable" entra a modo privilegiado');
    output.push('  - "configure terminal" entra a configuración global');
    output.push('  - "interface X" configura una interfaz');
    output.push('  - "router rip" configura RIPv1');
    output.push('  - "copy running-config startup-config" guarda la config');
    output.push('  - "erase startup-config" + "reload" resetea el router');
    output.push('  - "end" vuelve a privilegiado desde cualquier config');
    output.push('  - "exit" baja un nivel o cierra sesión en USER');
  } else { // '?'
    output.push('Comandos disponibles en este modo:');
    // We can't call buildMenuOptions without physicalAssignment here
    // Just show generic help for the mode
    const genericOptions: Record<ExecMode, string[]> = {
      user: ['enable', 'show ip route', 'show ip interface brief', 'help', 'exit'],
      privileged: ['configure terminal', 'show...', 'ping', 'copy running-config startup-config', 'erase startup-config', 'reload'],
      config: ['interface G0/0', 'interface G0/1', 'interface loopback', 'router rip', 'exit', 'end'],
      'config-if': ['ip address', 'shutdown', 'no shutdown', 'exit', 'end'],
      'config-router': ['network', 'no network', 'version 1', 'exit', 'end'],
    };
    for (const opt of genericOptions[mode] || []) {
      output.push(`  ${opt}`);
    }
  }
  return { newRouterState: {} as any, newSession: session, outputLines: output };
}

function handleExitSession(
  routerState: RouterState,
  session: TerminalSession,
  output: string[]
): CliExecutionResult {
  if (session.mode === 'user') {
    output.push('Sesión cerrada. Pulse Enter para continuar.');
    session.awaitingEnter = true;
    return { newRouterState: routerState, newSession: session, outputLines: output, sessionClosed: true };
  } else {
    // Exit from privileged/config modes goes down one level
    const modeOrder: ExecMode[] = ['user', 'privileged', 'config', 'config-if', 'config-router'];
    const currentIndex = modeOrder.indexOf(session.mode);
    if (currentIndex > 0) {
      session.mode = modeOrder[currentIndex - 1];
      if (session.mode !== 'config-if') {
        session.interfaceContext = undefined;
      }
    }
    output.push(`${getPrompt(routerState.running.hostname, session.mode)}exit`);
  }
  return { newRouterState: routerState, newSession: session, outputLines: output };
}

function handleConfirm(
  routerId: RouterId,
  routerState: RouterState,
  session: TerminalSession,
  output: string[],
  physicalAssignment: PhysicalAssignment
): CliExecutionResult {
  const confirmType = session.pendingConfirm!;
  session.pendingConfirm = undefined;

  if (confirmType === 'erase') {
    routerState.startup = null;
    routerState.erasedSinceBoot = true;
    output.push('[OK] Configuración de inicio borrada.');
  } else if (confirmType === 'reload') {
    if (routerState.startup) {
      routerState.running = deepClone(routerState.startup);
    } else {
      const { wan, lan } = getInterfaceNamesForRole(routerId, physicalAssignment);
      const hasLoopback = routerId === 'R2' || routerId === 'R3';
      const loopbackNum = routerId === 'R2' ? '2' : '3';

      const interfaces: Record<string, any> = {
        [wan]: { ip: null, mask: null, shutdown: true },
        [lan]: { ip: null, mask: null, shutdown: true },
      };
      if (hasLoopback) {
        interfaces[`loopback ${loopbackNum}`] = { ip: null, mask: null, shutdown: false };
      }

      routerState.running = {
        hostname: routerState.running.hostname,
        interfaces,
        rip: { enabled: false, version: null, networks: [] },
      };
    }
    routerState.eraseReloadDone = routerState.erasedSinceBoot;
    routerState.erasedSinceBoot = false;
    session.mode = 'user';
    session.interfaceContext = undefined;

    output.push('Proceed with reload? [confirm]');
    output.push('');
    output.push('System Bootstrap, Version 15.2...');
    output.push(`${routerState.running.hostname} uptime is 0 minutes`);
    output.push('System returned to ROM by reload');
    output.push('Press RETURN to get started!');
  }

  return { newRouterState: routerState, newSession: session, outputLines: output };
}

function handleIpAddressMask(
  routerId: RouterId,
  routerState: RouterState,
  session: TerminalSession,
  output: string[],
  interfaceName: string,
  mask: string
): CliExecutionResult {
  // The IP was stored in session.interfaceContext temporarily
  // Actually, we need to pass both values. Let's adjust: first value is IP, second is mask
  // For now, assume the first value was stored
  const ip = (session as any).pendingIpAddress;
  if (ip) {
    if (routerState.running.interfaces[interfaceName]) {
      routerState.running.interfaces[interfaceName].ip = ip;
      routerState.running.interfaces[interfaceName].mask = mask;
    }
    output.push(`${getPrompt(routerState.running.hostname, session.mode)}ip address ${ip} ${mask}`);
    delete (session as any).pendingIpAddress;
  }
  session.interfaceContext = undefined;
  return { newRouterState: routerState, newSession: session, outputLines: output };
}

function getPrompt(hostname: string, mode: ExecMode): string {
  switch (mode) {
    case 'user': return `${hostname}>`;
    case 'privileged': return `${hostname}#`;
    case 'config': return `${hostname}(config)#`;
    case 'config-if': return `${hostname}(config-if)#`;
    case 'config-router': return `${hostname}(config-router)#`;
    default: return `${hostname}#`;
  }
}

function getInterfaceNamesForRole(routerId: RouterId, physicalAssignment: PhysicalAssignment): { wan: string; lan: string } {
  const physicalLabel = physicalAssignment.routerRoles[routerId];
  return getInterfaceNames(physicalLabel);
}

// Need to import getInterfaceNames from cliMenu
import { getInterfaceNames } from './cliMenu';

// ==================== SESSION MANAGEMENT ====================

/**
 * Creates a new terminal session for a router.
 */
export function createTerminalSession(routerId: RouterId, routerState: RouterState): TerminalSession {
  return {
    routerId,
    mode: 'user',
    output: [`${routerState.running.hostname}>`, ''],
    awaitingEnter: false,
  };
}

/**
 * Invalidates a session (when console cable is moved/disconnected).
 */
export function invalidateSession(session: TerminalSession | null): TerminalSession | null {
  if (!session) return null;
  return {
    ...session,
    output: [...session.output, '', 'Conexión interrumpida. Pulse Enter para continuar.'],
    awaitingEnter: true,
  };
}