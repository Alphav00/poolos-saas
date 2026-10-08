// Types for the Emscripten glue built by phreeqc/build.sh. Only the
// functions listed in its EXPORTED_FUNCTIONS exist.
export interface PhreeqcModule {
  _CreateIPhreeqc(): number;
  _DestroyIPhreeqc(id: number): number;
  _LoadDatabaseString(id: number, input: number): number;
  _RunString(id: number, input: number): number;
  _GetErrorString(id: number): number;
  _GetWarningString(id: number): number;
  _GetSelectedOutputRowCount(id: number): number;
  _GetSelectedOutputColumnCount(id: number): number;
  _GetSelectedOutputValue2(
    id: number, row: number, col: number, vtype: number, dvalue: number, svalue: number, svalueLength: number,
  ): number;
  _SetErrorStringOn(id: number, on: number): number;
  _SetOutputStringOn(id: number, on: number): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
  UTF8ToString(ptr: number): string;
  stringToNewUTF8(s: string): number;
  HEAP32: Int32Array;
  HEAPF64: Float64Array;
}

export interface PhreeqcModuleOptions {
  instantiateWasm(
    imports: WebAssembly.Imports,
    done: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
  ): object;
}

declare const factory: (options: PhreeqcModuleOptions) => Promise<PhreeqcModule>;
export default factory;
