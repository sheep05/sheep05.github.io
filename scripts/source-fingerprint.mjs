// Exclude generated publication files so bot commits do not trigger rebuild loops.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=execFileSync('git',['ls-files','-z','app','frontend','lib','scripts','tests','.github','public',':!public/published/**','package.json','package-lock.json','vite.pages.config.ts','tsconfig.json','postcss.config.mjs'],{encoding:'utf8'}).split('\0').filter(Boolean).sort();
const hash=createHash('sha256');
for(const file of files)hash.update(file+'\0').update(readFileSync(file));
console.log(hash.digest('hex'));
