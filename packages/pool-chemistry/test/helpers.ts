import { readFileSync } from 'node:fs';
import { PoolChemistry, Phreeqc } from '../src';

const wasmPath = new URL('../phreeqc/phreeqc.wasm', import.meta.url);
let module: Promise<WebAssembly.Module> | undefined;
export const wasm = (): Promise<WebAssembly.Module> => (module ??= WebAssembly.compile(readFileSync(wasmPath)));

export const chemistry = async (): Promise<PoolChemistry> => PoolChemistry.create(await wasm());
export const phreeqc = async (): Promise<Phreeqc> => Phreeqc.create(await wasm());
