import http from 'node:http';
import {createHash} from 'node:crypto';
import {row,detail,evidence,page} from './fixtures.mjs';
let mode='normal';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 const send=(status,value,extra={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...extra});res.end(JSON.stringify(value));};
 // Loopback-only test control; absent from exported site and production API.
 if(u.pathname==='/control'&&req.method==='POST'){mode=u.searchParams.get('mode')||'normal';return send(200,{mode});}
 if(req.method!=='GET')return send(405,{error:'read_only'});
 if(mode==='offline')return send(503,{error:'offline'});
 if(mode==='rate')return send(429,{error:'rate_limit'},{'Retry-After':'2'});
 if(mode==='delay')await new Promise(r=>setTimeout(r,1500));
 if(u.pathname==='/web/v1/strategies'){
  const q=u.searchParams;const key=new URLSearchParams(q);key.delete('cursor');const binding=createHash('sha256').update(key.toString()).digest('hex').slice(0,16);
  let offset=0;if(q.get('cursor')){const parts=q.get('cursor').split(':');if(parts[0]!==binding||mode==='changed')return send(409,{error:'cursor_stale'});offset=Number(parts[1]);}
  const search=(q.get('search')||'').toLowerCase();let rows=Array.from({length:67},(_,i)=>row(i+1)).filter(r=>(!search||`${r.title} ${r.tags.join(' ')} ${r.league}`.toLowerCase().includes(search))&&(!q.get('league')||r.league.toLowerCase()===q.get('league').toLowerCase())&&(!q.get('map_type')||r.map_type===q.get('map_type'))&&(!q.get('tags')||q.get('tags').split(',').some(t=>r.tags.includes(t)))&&q.get('group')!=='group');
  if(mode==='empty')rows=[];
  const sort=q.get('sort')||'activity',order=q.get('order')||'desc';const pick=r=>({activity:r.updated_at,title:r.title,mod:r.observed.mod_average,maps:r.observed.map_count,cost_per_map:r.results.all_in_cost_per_map_chaos,profit_per_map:r.results.net_per_map_divines,score:r.score,div_per_hour:r.results.net_divines_per_hour})[sort];
  rows.sort((a,b)=>{const x=pick(a),y=pick(b);return x==null?y==null?a.id.localeCompare(b.id):1:y==null?-1:((typeof x==='string'?x.localeCompare(y):x-y)*(order==='asc'?1:-1)||a.id.localeCompare(b.id));});
  return send(200,page(rows.slice(offset,offset+25),{total:rows.length,sort,order,next_cursor:offset+25<rows.length?`${binding}:${offset+25}`:null}));
 }
 const match=u.pathname.match(/^\/web\/v1\/strategies\/11111111-1111-4111-8111-(\d{12})(\/evidence)?$/);if(!match||Number(match[1])<1||Number(match[1])>67)return send(404,{error:'unavailable'});
 return send(200,match[2]?evidence(Number(match[1])):detail(Number(match[1])));
});
server.listen(43121,'127.0.0.1',()=>console.log('Synthetic C1 review API: http://127.0.0.1:43121 (no production connection)'));
