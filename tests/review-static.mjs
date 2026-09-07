// Local artifact review only. Hosting rollout must verify the real host's headers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/client/',import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hashes=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter(m=>m[1]).map(m=>`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
const csp=`default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' https://web.poecdn.com; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'none'`;
http.createServer(async(req,res)=>{
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/web/v1/')){try{const response=await fetch('http://127.0.0.1:43121'+url.pathname+url.search,{signal:AbortSignal.timeout(20000)});res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store',...(response.headers.has('retry-after')?{'Retry-After':response.headers.get('retry-after')}:{})});return res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503,{'Content-Type':'application/json'});return res.end('{}');}}
 if(url.pathname==='/compare'){res.writeHead(302,{'Location':'/','Cache-Control':'no-store'});return res.end();}
 const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!filename.startsWith(root)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);return res.end('Not found');}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain','.rsc':'text/x-component'}[path.extname(filename)]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','Content-Security-Policy':csp,'Referrer-Policy':'no-referrer','Permissions-Policy':'clipboard-write=()','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(filename));
}).listen(43122,'127.0.0.1',()=>console.log('Static C1 artifact review: http://127.0.0.1:43122 (isolated fixtures; clipboard denied)'));
