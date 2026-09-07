import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../dist/client/',import.meta.url);
const paths=fs.readdirSync(root,{recursive:true}).filter(p=>fs.statSync(new URL(p.replaceAll('\\','/'),root)).isFile());
const forbidden=['Synthetic C1 review','synthetic local review data','Bestiary · Dunes farming','11111111-1111-4111-8111-000000000001','22222222-2222-4222-8222-000000000001','Allflame Farmers','/control?mode','DROP-OWNER','DROP-DISCORD','api.example.test','localhost:43121','127.0.0.1:43121','127.0.0.1:43128'];
for(const file of paths){if(/\.map$|fixtures|tests\/|service.worker/i.test(file))throw Error('Test/source asset in export: '+file);if(/\.(js|json|html|txt|css)$/.test(file)){const content=fs.readFileSync(new URL(file.replaceAll('\\','/'),root),'utf8');for(const text of forbidden)if(content.includes(text))throw Error('Unexpected artifact content: '+text);}}
if(!paths.includes('index.html')||!paths.some(p=>p.endsWith('.wasm')))throw Error('Missing static entry or browser compression asset');
const manifest=paths.sort().map(file=>({file:file.replaceAll('\\','/'),bytes:fs.statSync(new URL(file.replaceAll('\\','/'),root)).size,sha256:createHash('sha256').update(fs.readFileSync(new URL(file.replaceAll('\\','/'),root))).digest('hex')}));
fs.writeFileSync(new URL('../tests/artifact-manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`Static artifact: ${paths.length} files; no fixture records, test controls, source maps or live-service configuration.`);
