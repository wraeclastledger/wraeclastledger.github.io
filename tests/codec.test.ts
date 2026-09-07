import {describe,it,expect} from 'vitest';
import {brotliDecompressSync} from 'node:zlib';
import init,{compress} from '../node_modules/brotli-wasm/pkg.web/brotli_wasm.js';
import {readFileSync} from 'node:fs';
await init(readFileSync(new URL('../node_modules/brotli-wasm/pkg.web/brotli_wasm_bg.wasm',import.meta.url)));
import {generatePublicStrategySetupCode} from '../lib/vendor/setup-code.js';
import {decodeDiscordSharePayload} from './vendor/desktop-reader.js';
import {buildImportedSetupPlan} from './vendor/desktop-reader.js';
import {detail,evidence} from './fixtures.mjs';
const encode=async(payload:string)=>'wl3.'+Buffer.from(compress(new TextEncoder().encode(payload),{quality:11})).toString('base64url');
describe('browser codec to shipped desktop compatibility',()=>{
 it('round-trips the newest complete run and multiline notes through the actual desktop parser and price-free Load',async()=>{const d=detail();const e=evidence();const result=await generatePublicStrategySetupCode(d,e,encode);expect(result.status).toBe('available');if(result.status!=='available')return;expect(result.sourceEvidenceOrdinal).toBe(2);expect(result.code.length).toBeLessThanOrEqual(6000);const payload=brotliDecompressSync(Buffer.from(result.code.slice(4),'base64url')).toString();const parsed=decodeDiscordSharePayload(payload);expect(parsed).not.toBeNull();expect(parsed!.strategyNotes).not.toMatch(/[\r\n]/);const plan=buildImportedSetupPlan({mapType:parsed!.mapType,chisel:parsed!.chisel,scarabs:parsed!.scarabs,deliriumType:parsed!.deliOrbType,deliriumCountPerMap:parsed!.deliOrbQty,astrolabeType:parsed!.astroType});expect(plan).toEqual({mapType:'8-mod',chiselType:'Avarice',scarabNames:['Bestiary Scarab','Bestiary Scarab of the Herd'],deliriumType:'Fine',deliriumCountPerMap:2,astrolabeType:'Grasping Astrolabe'});expect(parsed).toMatchObject({operation:'share',updateStrategyId:null,evidenceTargetStrategyId:null,netProfit:-50,totalInvest:200});});
 it.each(['id','revision','incomplete'] as const)('withholds code for %s mismatch or missing proof',async kind=>{const e=evidence();if(kind==='id')e.strategy_id='22222222-2222-4222-8222-222222222222';else if(kind==='revision')e.revision=5;else e.runs=e.runs.map(r=>({...r,cost_breakdown:null})) as never;expect(await generatePublicStrategySetupCode(detail(),e,encode)).toMatchObject({status:'unavailable',reason:'incomplete_safe_source'});});
 it('contains worker encoding failure',async()=>{expect(await generatePublicStrategySetupCode(detail(),evidence(),()=>Promise.reject(Error('worker failed')))).toMatchObject({status:'unavailable',reason:'encoding_failed'});});
});
