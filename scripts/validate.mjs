import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import { loadEnv } from 'vite';
import { assertBuildEnvironment } from './build-policy.mjs';
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--profile')) {
  throw new Error('Usage: node scripts/validate.mjs [--profile same-origin|pages]');
}
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env,
  ...(args.length ? { WEBSITE_BUILD_PROFILE: args[1] } : {}) };
const { profile } = assertBuildEnvironment(env);
/** @type {Array<[string,string,string[]]>} */
const checks=[['typecheck','node_modules/typescript/bin/tsc',['--noEmit']],['tests','node_modules/vitest/vitest.mjs',['run']],['lint','node_modules/oxlint/bin/oxlint',[]],['build','node_modules/vinext/dist/cli.js',['build']],['artifact','scripts/check-artifact.mjs',['--profile', profile]]];
for(const [name,tool,args] of checks){const result=spawnSync(process.execPath,[tool,...args],{env,encoding:'utf8',windowsHide:true});fs.writeFileSync(`tests/${name}-log.txt`,(result.stdout||'')+(result.stderr||''));console.log(`${profile} ${name}: ${result.status===0?'PASS':'FAIL'}`);if(result.status!==0){console.error((result.stdout||'')+(result.stderr||''));process.exit(result.status||1);}}
