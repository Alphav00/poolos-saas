import { describe, expect, test } from 'vitest';
import { Phreeqc, PoolChemistry } from '../src';

// A valid WebAssembly module that imports a function the PHREEQC glue never
// supplies (x.y), so WebAssembly.instantiate rejects.
const UNLINKABLE = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // magic, version 1
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00, // type section: one () -> ()
  0x02, 0x07, 0x01, 0x01, 0x78, 0x01, 0x79, 0x00, 0x00, // import section: x.y, func type 0
]);

describe('engine start-up', () => {
  test('a failed instantiate rejects create instead of hanging', async () => {
    const wasm = await WebAssembly.compile(UNLINKABLE);
    await expect(Phreeqc.create(wasm)).rejects.toThrow(/Import #0/);
    await expect(PoolChemistry.create(wasm)).rejects.toThrow(/Import #0/);
  }, 5000);
});
