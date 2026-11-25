import { describe, it, expect } from 'vitest';
import { CABLE_INVENTORY_T1, CABLE_BREAKDOWN_T1 } from '../src/core/scenario';

describe('Inventario de cables T1 (diagramas de red y consola)', () => {
  it('red: 6 directos y 2 cruzados', () => {
    expect(CABLE_BREAKDOWN_T1.network).toEqual({ straight: 6, crossover: 2 });
  });

  it('consola: 1 ethernet directo y 1 USB a Ethernet', () => {
    expect(CABLE_BREAKDOWN_T1.console).toEqual({ straight: 1, usbEthernet: 1 });
  });

  it('el inventario total es la suma exacta, sin sobrantes', () => {
    expect(CABLE_INVENTORY_T1.straight).toBe(
      CABLE_BREAKDOWN_T1.network.straight + CABLE_BREAKDOWN_T1.console.straight,
    );
    expect(CABLE_INVENTORY_T1.crossover).toBe(CABLE_BREAKDOWN_T1.network.crossover);
    expect(CABLE_INVENTORY_T1.usbEthernet).toBe(CABLE_BREAKDOWN_T1.console.usbEthernet);
  });
});
