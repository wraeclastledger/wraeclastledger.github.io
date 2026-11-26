type Quote = { unit: 'chaos' | 'divine'; amount: number } | null;
type Samples = { sum: number; count: number } | null;
type Family = 'mirage' | 'beyond' | 'sentinel' | 'wildwood' | 'delirium';
type Orb = { id: string; used: number; price_each: Quote };
export interface CovensFields {
  version: 1;
  atlas_drops: Samples;
  more_threads: Samples;
  threads: { id: string; slot: number; paid: number; granted: number; paused: boolean; price_each: Quote }[] | null;
  ember: { id: string; price_each: Quote } | null;
  atlas: { version: string; choices: { node: number; option: number | null }[] } | null;
  orbs: Orb[] | null;
  delirium: { resolution: 'exact' | 'bands'; levels: [number, number][]; rewards: [string, number][] } | null;
  encounters: { readable: number; unknown: number; confirmed: Record<Family, number> } | null;
}
export function validCovens(value: unknown, maps: unknown): value is CovensFields;
export function orbSpend(rows: Orb[] | null, divinePrice: number | null): number | null;
