import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if (!process.argv[2]) throw Error('Pass the desktop source checkout as the first argument.');
const client=path.resolve(process.argv[2]);
const require=createRequire(path.join(client,'package.json'));
const {build}=require('esbuild');
const result=await build({absWorkingDir:client,alias:{fflate:path.join(site,'node_modules/fflate/esm/browser.js')},stdin:{contents:"export { generatePublicStrategySetupCode } from './src/renderer/src/utils/publicStrategySetupCode'; export { isSafeStrategyAtlasUrl } from './src/renderer/src/utils/atlasUrl';",resolveDir:client,sourcefile:'public-setup-entry.ts',loader:'ts'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,metafile:true,minify:true});
const output=path.join(site,'lib/vendor');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'setup-code.js'),result.outputFiles[0].contents);
const sources=Object.keys(result.metafile.inputs).filter(p=>p!=='public-setup-entry.ts').sort().map(file=>({path:file.replaceAll('\\','/').replace(path.relative(client, site).replaceAll('\\','/') + '/', 'website/'),sha256:createHash('sha256').update(fs.readFileSync(path.resolve(client,file))).digest('hex')}));
fs.writeFileSync(path.join(output,'provenance.json'),JSON.stringify({clientVersion:JSON.parse(fs.readFileSync(path.join(client,'package.json'))).version,source:'gund0lf/wraeclastledger_react; public setup adapter',exports:['generatePublicStrategySetupCode','isSafeStrategyAtlasUrl'],bundleSha256:createHash('sha256').update(result.outputFiles[0].contents).digest('hex'),sources},null,2)+'\n');
console.log(`Generated legacy Discord codec adapter: ${result.outputFiles[0].contents.length} bytes, ${sources.length} source inputs. Existing Discord wire unchanged.`);

// The independent setup-only format never passes through the Discord run codec.
const setupEntry = 'src/shared/strategySetupCode.ts';
const setupResult = await build({absWorkingDir:client,entryPoints:[setupEntry],bundle:true,
  format:'esm',platform:'browser',target:'es2022',write:false,metafile:true,minify:true});
fs.writeFileSync(path.join(output,'strategy-setup.js'),setupResult.outputFiles[0].contents);
const ts = require('typescript');
const declarations = ts.transpileDeclaration(fs.readFileSync(path.join(client,setupEntry),'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
if (declarations.diagnostics?.length) throw Error('Setup-code declarations could not be generated.');
fs.writeFileSync(path.join(output,'strategy-setup.d.ts'),declarations.outputText);
fs.writeFileSync(path.join(output,'strategy-setup.provenance.json'),JSON.stringify({
  source:'gund0lf/wraeclastledger_react', minimumAppVersion:'1.0.97',
  bundleSha256:createHash('sha256').update(setupResult.outputFiles[0].contents).digest('hex'),
  sources:Object.keys(setupResult.metafile.inputs).sort().map(file=>({
    path:file.replaceAll('\\','/'),sha256:createHash('sha256').update(fs.readFileSync(path.resolve(client,file))).digest('hex'),
  })),
},null,2)+'\n');
console.log('Generated shared setup-only codec and declarations.');
