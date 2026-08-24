import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = '_site/divine-blueprint-site';
const marker = 'data-divine-blueprint-referrals="true"';

const tracker = `<script ${marker}>(()=>{
const KEY='divine_blueprint_referral';
const MAX_AGE=30*24*60*60*1000;
const normalize=(value)=>{
  const cleaned=String(value||'').trim().toUpperCase();
  return /^[A-Z0-9_-]{2,64}$/.test(cleaned)?cleaned:'';
};
const save=(id)=>{
  if(!id)return;
  try{localStorage.setItem(KEY,JSON.stringify({id,ts:Date.now()}));}catch{}
};
const load=()=>{
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return '';
    const record=JSON.parse(raw);
    const id=normalize(record?.id);
    const ts=Number(record?.ts||0);
    if(!id||!ts||(Date.now()-ts)>MAX_AGE){localStorage.removeItem(KEY);return '';}
    return id;
  }catch{return '';}
};
const incoming=normalize(new URLSearchParams(location.search).get('ref'));
if(incoming)save(incoming);
window.DivineBlueprintReferral={get:()=>incoming||load(),storageKey:KEY,windowDays:30};
})();</script>`;

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'admin') continue;
      files.push(...await collect(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

const files = await collect(root);
let updated = 0;
for (const file of files) {
  let html = await readFile(file, 'utf8');
  if (html.includes(marker)) continue;
  if (!/<\/body>/i.test(html)) continue;
  html = html.replace(/<\/body>/i, `${tracker}\n</body>`);
  await writeFile(file, html, 'utf8');
  updated += 1;
}

console.log(`Installed 30-day Divine Blueprint referral tracking on ${updated} public HTML pages.`);
