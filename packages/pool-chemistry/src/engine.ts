// The PHREEQC engine: USGS IPhreeqc compiled to WebAssembly (phreeqc/build.sh).
//
// The caller passes the compiled WebAssembly.Module because each host loads it
// differently: a Cloudflare Worker imports the .wasm file as a module, Node
// tests read and compile it. Nothing here fetches or reads files.
import factory, { type PhreeqcModule } from '../phreeqc/phreeqc.mjs';
import { PHREEQC_DAT, PHREEQC_DAT_SHA256, POOL_DAT, POOL_DAT_SHA256 } from './database.generated';

/** Pinned in phreeqc/build.sh. */
export const IPHREEQC_COMMIT = 'f107fcb2f2e1e3167ce4c1328e477b54dee3d21b';

export interface EngineInfo {
  engine: string;
  iphreeqcCommit: string;
  phreeqcDatSha256: string;
  poolDatSha256: string;
}

export const ENGINE_INFO: EngineInfo = {
  engine: 'PHREEQC (USGS IPhreeqc, WebAssembly build)',
  iphreeqcCommit: IPHREEQC_COMMIT,
  phreeqcDatSha256: PHREEQC_DAT_SHA256,
  poolDatSha256: POOL_DAT_SHA256,
};

export class PhreeqcError extends Error {
  constructor(
    message: string,
    readonly input: string,
  ) {
    super(message);
    this.name = 'PhreeqcError';
  }
}

export type Cell = number | string | null;

/** One SELECTED_OUTPUT table: the heading row, then one row per result. */
export interface Table {
  headings: string[];
  rows: Cell[][];
}

/**
 * phreeqc.dat ends its data with a single END line, after which come only
 * comments. pool.dat goes just before it so both load as one database.
 */
export function combinedDatabase(phreeqcDat = PHREEQC_DAT, poolDat = POOL_DAT): string {
  const ends = phreeqcDat.match(/^END\r?$/gm) ?? [];
  if (ends.length !== 1) throw new Error(`phreeqc.dat should have one END line, found ${ends.length}`);
  return phreeqcDat.replace(/^END\r?$/m, () => `${poolDat}\nEND`);
}

const VALUE_TYPE = { empty: 0, long: 1, double: 3, string: 4 } as const;
const STRING_BUFFER = 256;

export class Phreeqc {
  private constructor(
    private readonly m: PhreeqcModule,
    private readonly id: number,
  ) {}

  static async create(wasm: WebAssembly.Module, database = combinedDatabase()): Promise<Phreeqc> {
    // Emscripten waits for done() and has no failure callback, so a failed
    // instantiate would leave its promise pending forever. Reject instead, so
    // a caller that caches this promise can drop it and try again.
    const m = await new Promise<PhreeqcModule>((resolve, reject) => {
      factory({
        instantiateWasm(imports, done) {
          WebAssembly.instantiate(wasm, imports).then((instance) => done(instance, wasm), reject);
          return {};
        },
      }).then(resolve, reject);
    });
    const id = m._CreateIPhreeqc();
    if (id < 0) throw new Error('PHREEQC: could not create an instance');
    m._SetErrorStringOn(id, 1);
    m._SetOutputStringOn(id, 0);
    const engine = new Phreeqc(m, id);
    const errors = engine.call((p) => m._LoadDatabaseString(id, p), database);
    if (errors !== 0) throw new PhreeqcError(`PHREEQC database: ${engine.errorText()}`, '');
    return engine;
  }

  /** Runs one PHREEQC input and returns its first SELECTED_OUTPUT table. */
  run(input: string): Table {
    const m = this.m;
    const errors = this.call((p) => m._RunString(this.id, p), input);
    if (errors !== 0) throw new PhreeqcError(this.errorText(), input);
    const rowCount = m._GetSelectedOutputRowCount(this.id);
    const colCount = m._GetSelectedOutputColumnCount(this.id);
    const vtype = m._malloc(4);
    const dvalue = m._malloc(8);
    const svalue = m._malloc(STRING_BUFFER);
    try {
      const rows: Cell[][] = [];
      for (let r = 0; r < rowCount; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < colCount; c++) {
          m._GetSelectedOutputValue2(this.id, r, c, vtype, dvalue, svalue, STRING_BUFFER);
          const type = m.HEAP32[vtype >> 2];
          if (type === VALUE_TYPE.double) row.push(m.HEAPF64[dvalue >> 3] ?? null);
          else if (type === VALUE_TYPE.string) row.push(m.UTF8ToString(svalue));
          else if (type === VALUE_TYPE.empty) row.push(null);
          else throw new PhreeqcError(`PHREEQC: unexpected value type ${type}`, input);
        }
        rows.push(row);
      }
      const [headings = [], ...rest] = rows;
      return { headings: headings.map(String), rows: rest };
    } finally {
      m._free(vtype);
      m._free(dvalue);
      m._free(svalue);
    }
  }

  warnings(): string {
    return this.m.UTF8ToString(this.m._GetWarningString(this.id)).trim();
  }

  private errorText(): string {
    return this.m.UTF8ToString(this.m._GetErrorString(this.id)).trim();
  }

  private call(fn: (ptr: number) => number, text: string): number {
    const ptr = this.m.stringToNewUTF8(text);
    try {
      return fn(ptr);
    } finally {
      this.m._free(ptr);
    }
  }
}
