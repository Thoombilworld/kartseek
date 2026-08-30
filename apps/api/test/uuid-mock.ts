/**
 * Stand-in for the `uuid` package under Jest.
 *
 * uuid v14 ships ESM only (no `main`; `dist-node/index.js` uses `export`), which
 * the ts-jest CommonJS transform cannot load. Any suite that transitively
 * imports it — anything pulling in @app/security, for instance — used to fail at
 * import time, which is why the gateway controllers had no tests at all.
 *
 * Keeps the real signatures and RFC-4122 shape so behaviour is unchanged for
 * tests, without having to transform ESM inside node_modules.
 */

const HEX = '0123456789abcdef';

export function v4(): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4'; // version nibble
    } else if (i === 19) {
      out += HEX[8 + ((Math.random() * 4) | 0)]; // variant: 8, 9, a or b
    } else {
      out += HEX[(Math.random() * 16) | 0];
    }
  }
  return out;
}

export const v1 = v4;
export const v3 = v4;
export const v5 = v4;
export const v6 = v4;
export const v7 = v4;

export const NIL = '00000000-0000-0000-0000-000000000000';

const UUID_RE =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

export function validate(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function version(value: string): number {
  if (!validate(value)) throw new TypeError('Invalid UUID');
  return parseInt(value.slice(14, 15), 16);
}

export function parse(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, ''), 'hex');
}

export function stringify(bytes: ArrayLike<number>): string {
  const hex = Buffer.from(bytes as Uint8Array).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
