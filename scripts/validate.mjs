import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
/** @type {Array<[string,string,string[]]>} */
const checks=[['typecheck','node_modules/typescript/bin/tsc',['--noEmit']],['tests','node_modules/vitest/vitest.mjs',['run']],['lint','node_modules/oxlint/bin/oxlint',[]],['build','node_modules/vinext/dist/cli.js',['build']],['artifact','scripts/check-artifact.mjs',[]]];
for(const [name,tool,args] of checks){const result=spawnSync(process.execPath,[tool,...args],{encoding:'utf8',windowsHide:true});fs.writeFileSync(`tests/${name}-log.txt`,(result.stdout||'')+(result.stderr||''));console.log(`${name}: ${result.status===0?'PASS':'FAIL'}`);if(result.status!==0){console.error((result.stdout||'')+(result.stderr||''));process.exit(result.status||1);}}
