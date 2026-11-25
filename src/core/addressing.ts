/**
 * Address derivation for Topology 1 IPv4/RIPv1.
 * Pure function: deriveAddresses(input) -> Result<AddressPlan, ValidationError[]>
 * No side effects, no external dependencies.
 */

import type {
  SectionGroupInput,
  AddressPlan,
  ValidationError,
  Result,
} from './types';

/**
 * Validates and derives all IP addresses from section (X) and group (Y).
 * Follows the PDF LabCeroTopologia.pdf page 3 exactly.
 */
export function deriveAddresses(input: SectionGroupInput): Result<AddressPlan> {
  const errors: ValidationError[] = [];
  const { section: X, group: Y } = input;

  // Basic type/range checks
  if (!Number.isInteger(X) || X < 1) {
    errors.push({ field: 'section', message: 'La sección (X) debe ser un entero positivo' });
  }
  if (!Number.isInteger(Y) || Y < 1) {
    errors.push({ field: 'group', message: 'El grupo (Y) debe ser un entero positivo' });
  }

  // YX concatenation (string concatenation, not multiplication)
  const yx = `${Y}${X}`;
  const yxNum = parseInt(yx, 10);

  // YX must fit in an octet (2-254, not 0/1/255 broadcast)
  if (yxNum < 2 || yxNum > 254) {
    errors.push({
      field: 'yx',
      message: `YX="${yx}" supera el rango válido de octeto (2-254)`,
    });
  }

  // Y+1 must fit in octet for router interfaces
  if (Y + 1 > 254) {
    errors.push({
      field: 'group',
      message: `Y+1 = ${Y + 1} supera 254, inválido para interfaces de router`,
    });
  }

  // Loopback X and Y must be 1-254
  if (X < 1 || X > 254) {
    errors.push({
      field: 'loopback',
      message: `X=${X} fuera de rango para loopback (1-254)`,
    });
  }
  if (Y < 1 || Y > 254) {
    errors.push({
      field: 'loopback',
      message: `Y=${Y} fuera de rango para loopback (1-254)`,
    });
  }

  // Gateway collision checks
  // PC-1 gateway is 192.168.30.1, PC-1 IP is 192.168.30.YX
  // PC-2 gateway is 192.168.40.1, PC-2 IP is 192.168.40.YX
  if (yxNum === 1) {
    errors.push({
      field: 'gateway',
      message: 'YX=1 colisiona con gateway .1 de las LANs',
    });
  }

  // R2 G0/1 is 192.168.30.1 (gateway for PC-1) - cannot duplicate
  // R3 G0/1 is 192.168.40.1 (gateway for PC-2) - cannot duplicate
  // These are fixed, so YX != 1 already checked above

  // R1 G0/0 = 192.168.10.Y, R2 G0/0 = 192.168.10.(Y+1) - must not collide
  if (Y === Y + 1) {
    errors.push({ field: 'duplicate', message: 'Colisión imposible Y vs Y+1' });
  }

  // R1 G0/1 = 192.168.20.Y, R3 G0/0 = 192.168.20.(Y+1) - must not collide
  // Always different since Y != Y+1

  // Check for duplicate IPs in same subnet
  const ipsIn10 = [`192.168.10.${Y}`, `192.168.10.${Y + 1}`];
  const ipsIn20 = [`192.168.20.${Y}`, `192.168.20.${Y + 1}`];
  const ipsIn30 = [`192.168.30.1`, `192.168.30.${yxNum}`];
  const ipsIn40 = [`192.168.40.1`, `192.168.40.${yxNum}`];

  checkDuplicates(ipsIn10, '192.168.10.0/24', errors);
  checkDuplicates(ipsIn20, '192.168.20.0/24', errors);
  checkDuplicates(ipsIn30, '192.168.30.0/24', errors);
  checkDuplicates(ipsIn40, '192.168.40.0/24', errors);

  if (errors.length > 0) {
    return { ok: false, error: errors };
  }

  // All valid - build AddressPlan
  const plan: AddressPlan = {
    r1: {
      g0_0: `192.168.10.${Y}`,
      g0_1: `192.168.20.${Y}`,
    },
    r2: {
      g0_0: `192.168.10.${Y + 1}`,
      g0_1: '192.168.30.1',
      loopback2: `172.16.${X}.${Y}`,
    },
    r3: {
      g0_0: `192.168.20.${Y + 1}`,
      g0_1: '192.168.40.1',
      loopback3: `172.17.${X}.${Y}`,
    },
    pc1: {
      ip: `192.168.30.${yxNum}`,
      mask: '255.255.255.0',
      gateway: '192.168.30.1',
    },
    pc2: {
      ip: `192.168.40.${yxNum}`,
      mask: '255.255.255.0',
      gateway: '192.168.40.1',
    },
    yx,
    input,
  };

  return { ok: true, value: plan };
}

function checkDuplicates(
  ips: string[],
  subnet: string,
  errors: ValidationError[]
): void {
  const seen = new Set<string>();
  for (const ip of ips) {
    if (seen.has(ip)) {
      errors.push({
        field: 'duplicate',
        message: `IP duplicada ${ip} en ${subnet}`,
      });
    }
    seen.add(ip);
  }
}

/**
 * Format mask as dotted decimal for display.
 */
export function formatMask(prefixLen: number): string {
  const masks: Record<number, string> = {
    8: '255.0.0.0',
    16: '255.255.0.0',
    24: '255.255.255.0',
  };
  return masks[prefixLen] ?? `/${prefixLen}`;
}

/**
 * Parse an IPv4 string to 32-bit unsigned number for comparisons.
 */
export function ipToNumber(ip: string): number {
  const octets = ip.split('.').map(o => parseInt(o, 10));
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Check if an IP is network or broadcast address for a given prefix.
 */
export function isNetworkOrBroadcast(ip: string, prefixLen: number): boolean {
  const num = ipToNumber(ip);
  // Create mask using unsigned 32-bit arithmetic
  const hostBits = 32 - prefixLen;
  const mask = hostBits === 0 ? 0xffffffff : (~((1 << hostBits) - 1)) >>> 0;
  // Use >>> 0 to ensure unsigned comparison after bitwise operations
  const network = (num & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return num === network || num === broadcast;
}