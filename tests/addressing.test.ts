/**
 * Unit tests for addressing.ts - Core address derivation logic.
 */

import { describe, it, expect } from 'vitest';
import { deriveAddresses, ipToNumber, isNetworkOrBroadcast } from '@core/addressing';
import type { SectionGroupInput } from '@core/types';

describe('deriveAddresses', () => {
  // Valid cases from PDF examples
  describe('valid X/Y combinations', () => {
    it('X=1, Y=1 matches PDF example', () => {
      const result = deriveAddresses({ section: 1, group: 1 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pc1.ip).toBe('192.168.30.11');
        expect(result.value.pc2.ip).toBe('192.168.40.11');
        expect(result.value.yx).toBe('11');
        expect(result.value.r1.g0_0).toBe('192.168.10.1');
        expect(result.value.r2.g0_0).toBe('192.168.10.2');
        expect(result.value.r2.loopback2).toBe('172.16.1.1');
        expect(result.value.r3.loopback3).toBe('172.17.1.1');
      }
    });

    it('X=3, Y=12 produces YX=123', () => {
      const result = deriveAddresses({ section: 3, group: 12 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.yx).toBe('123');
        expect(result.value.pc1.ip).toBe('192.168.30.123');
        expect(result.value.pc2.ip).toBe('192.168.40.123');
        expect(result.value.r1.g0_0).toBe('192.168.10.12');
        expect(result.value.r2.g0_0).toBe('192.168.10.13');
        expect(result.value.r2.loopback2).toBe('172.16.3.12');
        expect(result.value.r3.loopback3).toBe('172.17.3.12');
      }
    });

    it('X=9, Y=18 works (max provisional)', () => {
      const result = deriveAddresses({ section: 9, group: 18 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.yx).toBe('189');
        expect(result.value.pc1.ip).toBe('192.168.30.189');
      }
    });
  });

  // Invalid cases
  describe('invalid X/Y combinations', () => {
    it('rejects X=0', () => {
      const result = deriveAddresses({ section: 0, group: 1 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some(e => e.field === 'section')).toBe(true);
      }
    });

    it('rejects Y=0', () => {
      const result = deriveAddresses({ section: 1, group: 0 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some(e => e.field === 'group')).toBe(true);
      }
    });

    it('rejects negative values', () => {
      const result = deriveAddresses({ section: -1, group: 1 });
      expect(result.ok).toBe(false);
    });

    it('rejects X=10, Y=12 (YX=1210 > 254)', () => {
      const result = deriveAddresses({ section: 10, group: 12 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some(e => e.field === 'yx')).toBe(true);
        expect(result.error[0].message).toContain('1210');
      }
    });

    it('rejects Y=254 (Y+1 > 254)', () => {
      const result = deriveAddresses({ section: 1, group: 254 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some(e => e.field === 'group')).toBe(true);
      }
    });

    it('rejects YX=1 (collides with gateway)', () => {
      const result = deriveAddresses({ section: 1, group: 0 }); // YX=01=1
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some(e => e.field === 'gateway')).toBe(true);
      }
    });

    it('rejects non-integer X', () => {
      const result = deriveAddresses({ section: 1.5, group: 1 });
      expect(result.ok).toBe(false);
    });
  });

  describe('address structure', () => {
    it('returns all required router interfaces', () => {
      const result = deriveAddresses({ section: 1, group: 1 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const { r1, r2, r3 } = result.value;
        expect(r1.g0_0).toBeDefined();
        expect(r1.g0_1).toBeDefined();
        expect(r2.g0_0).toBeDefined();
        expect(r2.g0_1).toBeDefined();
        expect(r2.loopback2).toBeDefined();
        expect(r3.g0_0).toBeDefined();
        expect(r3.g0_1).toBeDefined();
        expect(r3.loopback3).toBeDefined();
      }
    });

    it('returns PC config with mask and gateway', () => {
      const result = deriveAddresses({ section: 1, group: 1 });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pc1.mask).toBe('255.255.255.0');
        expect(result.value.pc1.gateway).toBe('192.168.30.1');
        expect(result.value.pc2.mask).toBe('255.255.255.0');
        expect(result.value.pc2.gateway).toBe('192.168.40.1');
      }
    });

    it('preserves input X/Y in result', () => {
      const input: SectionGroupInput = { section: 5, group: 7 };
      const result = deriveAddresses(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.input).toEqual(input);
      }
    });
  });
});

describe('ipToNumber', () => {
  it('converts IPv4 to number', () => {
    // 192.168.30.11 = 192*256^3 + 168*256^2 + 30*256 + 11 = 3232243211
    expect(ipToNumber('192.168.30.11')).toBe(3232243211);
    // 10.0.0.1 = 10*256^3 + 0 + 0 + 1 = 167772161
    expect(ipToNumber('10.0.0.1')).toBe(167772161);
    // 255.255.255.255 = 4294967295
    expect(ipToNumber('255.255.255.255')).toBe(4294967295);
  });
});

describe('isNetworkOrBroadcast', () => {
  it('detects network address', () => {
    expect(isNetworkOrBroadcast('192.168.30.0', 24)).toBe(true);
    expect(isNetworkOrBroadcast('10.0.0.0', 8)).toBe(true);
  });

  it('detects broadcast address', () => {
    expect(isNetworkOrBroadcast('192.168.30.255', 24)).toBe(true);
    expect(isNetworkOrBroadcast('10.255.255.255', 8)).toBe(true);
  });

  it('returns false for host addresses', () => {
    expect(isNetworkOrBroadcast('192.168.30.11', 24)).toBe(false);
    expect(isNetworkOrBroadcast('192.168.30.1', 24)).toBe(false);
  });
});