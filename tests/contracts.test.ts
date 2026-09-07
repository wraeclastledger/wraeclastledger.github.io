import {describe,it,expect} from 'vitest';
import dto from './vendor/server-dto.json';
import {PublicApi,validateResponse} from '../lib/api';
import {id} from './fixtures.mjs';
// Golden projections generated from the actual accepted B1 mapper by sync-upstream.mjs.
describe('accepted server DTO and response deadlines',()=>{
 it('accepts the server sparse strategy/list/run projections',()=>{expect(()=>validateResponse(dto.detail,'detail')).not.toThrow();expect(()=>validateResponse({schema_version:1,total:1,limit:25,sort:'activity',order:'desc',strategies:[dto.row],next_cursor:null},'list')).not.toThrow();expect(()=>validateResponse({schema_version:1,strategy_id:id(1),revision:1,runs:[dto.run],next_cursor:null},'evidence')).not.toThrow();});
 it('times out a response body that never finishes',async()=>{const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('{'));}});const api=new PublicApi('/web/v1',()=>Promise.resolve(new Response(stream,{headers:{'Content-Type':'application/json'}})),5);await expect(api.detail(id(1),new AbortController().signal)).rejects.toMatchObject({kind:'timeout'});});
 it('still releases state when a transport ignores cancellation',async()=>{const api=new PublicApi('/web/v1',()=>new Promise<Response>(()=>{}),5);await expect(api.detail(id(1),new AbortController().signal)).rejects.toMatchObject({kind:'timeout'});});
});
