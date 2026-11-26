/**
 * CLI Menus and value lists for Let Him Network H2.
 * Pure TypeScript - generates menus from AddressPlan and physical assignment.
 */

import type { AddressPlan, RouterId, ExecMode, CliMenuOption, ValueListItem, PhysicalAssignment } from './types';

// ==================== INTERFACE NAMES BY PHYSICAL ROUTER ====================

/**
 * Determines interface naming convention based on physical router number.
 * Routers 1-8: GigabitEthernet (G0/0, G0/1)
 * Routers 9-12: FastEthernet (F0/0, F0/1)
 */
export function getInterfaceNames(physicalRouterLabel: string): { wan: string; lan: string } {
  // Extract number from labels like "Router 7", "Router 12", etc.
  const match = physicalRouterLabel.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 1;

  if (num >= 1 && num <= 8) {
    return { wan: 'GigabitEthernet0/0', lan: 'GigabitEthernet0/1' };
  } else {
    return { wan: 'FastEthernet0/0', lan: 'FastEthernet0/1' };
  }
}

// ==================== VALUE LISTS FROM ADDRESSPLAN ====================

/**
 * All IP addresses used in the topology (for ip address selector).
 * Includes router interfaces, loopbacks, PC IPs, and gateways.
 */
export function getAllIpAddresses(plan: AddressPlan): ValueListItem[] {
  const items: ValueListItem[] = [
    { value: plan.r1.g0_0, label: plan.r1.g0_0, description: 'R1 G0/0' },
    { value: plan.r1.g0_1, label: plan.r1.g0_1, description: 'R1 G0/1' },
    { value: plan.r2.g0_0, label: plan.r2.g0_0, description: 'R2 G0/0' },
    { value: plan.r2.g0_1, label: plan.r2.g0_1, description: 'R2 G0/1' },
    { value: plan.r2.loopback2, label: plan.r2.loopback2, description: 'R2 Loopback2' },
    { value: plan.r3.g0_0, label: plan.r3.g0_0, description: 'R3 G0/0' },
    { value: plan.r3.g0_1, label: plan.r3.g0_1, description: 'R3 G0/1' },
    { value: plan.r3.loopback3, label: plan.r3.loopback3, description: 'R3 Loopback3' },
    { value: plan.pc1.ip, label: plan.pc1.ip, description: 'PC-1 NIC' },
    { value: plan.pc2.ip, label: plan.pc2.ip, description: 'PC-2 NIC' },
    { value: plan.pc1.gateway, label: plan.pc1.gateway, description: 'PC-1 Gateway (R2 G0/1)' },
    { value: plan.pc2.gateway, label: plan.pc2.gateway, description: 'PC-2 Gateway (R3 G0/1)' },
  ];
  return items;
}

/**
 * Subnet masks available in the topology.
 */
export function getSubnetMasks(): ValueListItem[] {
  return [
    { value: '255.255.255.0', label: '255.255.255.0 (/24)', description: 'Redes LAN /24' },
    { value: '255.255.0.0', label: '255.255.0.0 (/16)', description: 'Loopbacks /16' },
  ];
}

/**
 * Major networks for RIPv1 network command.
 */
export function getMajorNetworks(plan: AddressPlan): ValueListItem[] {
  return [
    { value: '192.168.10.0', label: '192.168.10.0', description: 'R1-R2 link' },
    { value: '192.168.20.0', label: '192.168.20.0', description: 'R1-R3 link' },
    { value: '192.168.30.0', label: '192.168.30.0', description: 'PC-1 LAN' },
    { value: '192.168.40.0', label: '192.168.40.0', description: 'PC-2 LAN' },
    { value: '172.16.0.0', label: '172.16.0.0', description: 'R2 Loopback2' },
    { value: '172.17.0.0', label: '172.17.0.0', description: 'R3 Loopback3' },
  ];
}

/**
 * Ping destinations (all reachable IPs in topology).
 */
export function getPingDestinations(plan: AddressPlan): ValueListItem[] {
  return getAllIpAddresses(plan);
}

/**
 * Show command types for PRIVILEGED and USER modes.
 */
export function getShowTypes(mode: ExecMode): ValueListItem[] {
  if (mode === 'privileged') {
    return [
      { value: 'running-config', label: 'running-config', description: 'Configuración activa' },
      { value: 'startup-config', label: 'startup-config', description: 'Configuración guardada (NVRAM)' },
      { value: 'ip route', label: 'ip route', description: 'Tabla de rutas' },
      { value: 'ip interface brief', label: 'ip interface brief', description: 'Resumen de interfaces' },
    ];
  } else { // user mode
    return [
      { value: 'ip route', label: 'ip route', description: 'Tabla de rutas' },
      { value: 'ip interface brief', label: 'ip interface brief', description: 'Resumen de interfaces' },
    ];
  }
}

// ==================== MENU DEFINITIONS ====================

/**
 * Builds the menu options for a given mode and router role.
 */
export function buildMenuOptions(
  mode: ExecMode,
  routerRole: RouterId,
  physicalAssignment: PhysicalAssignment
): CliMenuOption[] {
  const physicalRouterLabel = physicalAssignment.routerRoles[routerRole];
  const { wan, lan } = getInterfaceNames(physicalRouterLabel);
  const hasLoopback = routerRole === 'R2' || routerRole === 'R3';
  const loopbackNum = routerRole === 'R2' ? '2' : '3';

  switch (mode) {
    case 'user': {
      return [
        { id: 'enable', label: 'enable', action: 'transition', targetMode: 'privileged', generatesCommand: 'enable' },
        { id: 'show', label: 'show…', action: 'show', subMenu: getShowTypes('user').map(s => ({
          id: s.value, label: s.label, action: 'execute', generatesCommand: `show ${s.value}`, valueType: 'show-type'
        })) },
        { id: 'help', label: 'help', action: 'help', generatesCommand: 'help' },
        { id: 'exit', label: 'exit', action: 'exit-session' },
        { id: 'help-mark', label: '?', action: 'help', generatesCommand: '?' },
      ];
    }

    case 'privileged': {
      return [
        { id: 'config-t', label: 'configure terminal', action: 'transition', targetMode: 'config', generatesCommand: 'configure terminal' },
        { id: 'show', label: 'show…', action: 'show', subMenu: getShowTypes('privileged').map(s => ({
          id: s.value, label: s.label, action: 'execute', generatesCommand: `show ${s.value}`, valueType: 'show-type'
        })) },
        { id: 'ping', label: 'ping', action: 'value-select', valueType: 'ping-dest', generatesCommand: 'ping {value}' },
        { id: 'copy-run-start', label: 'copy running-config startup-config', action: 'execute', generatesCommand: 'copy running-config startup-config', requiresConfirm: true },
        { id: 'erase-start', label: 'erase startup-config', action: 'execute', generatesCommand: 'erase startup-config', requiresConfirm: true },
        { id: 'reload', label: 'reload', action: 'execute', generatesCommand: 'reload', requiresConfirm: true },
        { id: 'help-mark', label: '?', action: 'help', generatesCommand: '?' },
      ];
    }

    case 'config': {
      const options: CliMenuOption[] = [
        { id: 'int-wan', label: `interface ${wan}`, action: 'transition', targetMode: 'config-if', generatesCommand: `interface ${wan}`, interfaceContext: wan },
        { id: 'int-lan', label: `interface ${lan}`, action: 'transition', targetMode: 'config-if', generatesCommand: `interface ${lan}`, interfaceContext: lan },
      ];
      if (hasLoopback) {
        options.push({
          id: 'int-loopback', label: `interface loopback ${loopbackNum}`, action: 'transition', targetMode: 'config-if', generatesCommand: `interface loopback ${loopbackNum}`, interfaceContext: `loopback ${loopbackNum}`
        });
      }
      options.push(
        { id: 'router-rip', label: 'router rip', action: 'transition', targetMode: 'config-router', generatesCommand: 'router rip' },
        { id: 'exit', label: 'exit', action: 'transition', targetMode: 'privileged', generatesCommand: 'exit' },
        { id: 'end', label: 'end', action: 'transition', targetMode: 'privileged', generatesCommand: 'end' },
        { id: 'help-mark', label: '?', action: 'help', generatesCommand: '?' }
      );
      return options;
    }

    case 'config-if': {
      return [
        { id: 'ip-address', label: 'ip address', action: 'value-select', valueType: 'ip-address', generatesCommand: 'ip address {ip} {mask}', subMenu: [] },
        { id: 'shutdown', label: 'shutdown', action: 'execute', generatesCommand: 'shutdown' },
        { id: 'no-shutdown', label: 'no shutdown', action: 'execute', generatesCommand: 'no shutdown' },
        { id: 'exit', label: 'exit', action: 'transition', targetMode: 'config', generatesCommand: 'exit' },
        { id: 'end', label: 'end', action: 'transition', targetMode: 'privileged', generatesCommand: 'end' },
        { id: 'help-mark', label: '?', action: 'help', generatesCommand: '?' },
      ];
    }

    case 'config-router': {
      return [
        { id: 'network', label: 'network', action: 'value-select', valueType: 'network', generatesCommand: 'network {value}' },
        { id: 'no-network', label: 'no network', action: 'value-select', valueType: 'network', generatesCommand: 'no network {value}' },
        { id: 'version-1', label: 'version 1', action: 'execute', generatesCommand: 'version 1' },
        { id: 'exit', label: 'exit', action: 'transition', targetMode: 'config', generatesCommand: 'exit' },
        { id: 'end', label: 'end', action: 'transition', targetMode: 'privileged', generatesCommand: 'end' },
        { id: 'help-mark', label: '?', action: 'help', generatesCommand: '?' },
      ];
    }

    default:
      return [];
  }
}

/**
 * Gets the value list for a given valueType and context.
 */
export function getValueList(
  valueType: 'ip-address' | 'mask' | 'network' | 'ping-dest',
  plan: AddressPlan,
  routerRole?: RouterId,
  currentNetworks?: string[]
): ValueListItem[] {
  switch (valueType) {
    case 'ip-address':
      return getAllIpAddresses(plan);
    case 'mask':
      return getSubnetMasks();
    case 'network':
      return getMajorNetworks(plan);
    case 'ping-dest':
      return getPingDestinations(plan);
    default:
      return [];
  }
}

/**
 * Gets configured networks for a router (for "no network" selector).
 */
export function getConfiguredNetworks(routerState: { rip: { networks: string[] } }): ValueListItem[] {
  return routerState.rip.networks.map(n => ({ value: n, label: n, description: 'Configurada en RIP' }));
}

/**
 * Initial router configuration (can be empty or pre-loaded with seed-based config).
 * Returns a RouterConfig with all interfaces shutdown and no RIP.
 */
export function createEmptyRouterConfig(hostname: string = 'Router'): {
  hostname: string;
  interfaces: Record<string, { ip: string | null; mask: string | null; shutdown: boolean }>;
  rip: { enabled: boolean; version: 1 | null; networks: string[] };
} {
  return {
    hostname,
    interfaces: {},
    rip: { enabled: false, version: null, networks: [] },
  };
}

/**
 * Creates initial router state with optional pre-loaded startup config.
 */
export function createInitialRouterState(
  routerRole: RouterId,
  physicalAssignment: PhysicalAssignment,
  seed: number
): { running: any; startup: any; eraseReloadDone: boolean; erasedSinceBoot: boolean } {
  const physicalLabel = physicalAssignment.routerRoles[routerRole];
  const { wan, lan } = getInterfaceNames(physicalLabel);
  const hasLoopback = routerRole === 'R2' || routerRole === 'R3';
  const loopbackNum = routerRole === 'R2' ? '2' : '3';

  // Base interfaces (all shutdown initially)
  const interfaces: Record<string, { ip: string | null; mask: string | null; shutdown: boolean }> = {
    [wan]: { ip: null, mask: null, shutdown: true },
    [lan]: { ip: null, mask: null, shutdown: true },
  };
  if (hasLoopback) {
    interfaces[`loopback ${loopbackNum}`] = { ip: null, mask: null, shutdown: false }; // Loopbacks are not shutdown by default
  }

  // Deterministic "pre-loaded" config based on seed (can be empty or have some config)
  // For now, start empty. Can be extended to have random pre-config per seed.
  const hostname = `Router-${physicalLabel.split(' ')[1]}`; // e.g., "Router-7"

  const baseConfig = {
    hostname,
    interfaces,
    rip: { enabled: false, version: null as 1 | null, networks: [] as string[] },
  };

  return {
    running: JSON.parse(JSON.stringify(baseConfig)), // Deep clone
    startup: JSON.parse(JSON.stringify(baseConfig)), // Start with same config
    eraseReloadDone: false,
    erasedSinceBoot: false,
  };
}