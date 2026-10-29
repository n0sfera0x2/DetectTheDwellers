// Merge Ink & Static fragments into the repo's art files.
// Usage: node tools/ink/<batch>/scenes.js for each batch, then node tools/ink/merge.js [--write] (dry run without --write).
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..', '..');
const HERE = __dirname, ORDER = ['lead', 'mobs-a', 'mobs-b', 'bosses', 'crew', 'world', 'story'];
const { JSDOM } = require(path.join(REPO, 'node_modules/jsdom'));
const parser = new (new JSDOM('').window.DOMParser)();

const artP = path.join(REPO, 'data/art.json'), printP = path.join(REPO, 'data/art-print.json');
const art = JSON.parse(fs.readFileSync(artP, 'utf8')), print = JSON.parse(fs.readFileSync(printP, 'utf8'));
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => typeof v === 'string' ? [[p + k, v]] : flat(v, p + k + '.'));
const set = (o, key, v) => { const ks = key.split('.'), last = ks.pop(); let t = o; for (const k of ks) t = t[k] = t[k] || {}; t[last] = v; };
const viewBox = s => (s.match(/viewBox="([^"]+)"/) || [])[1];

const before = new Map(flat(art)), beforeP = new Map(flat(print)), done = new Set(), problems = [];
for (const dir of ORDER) {
  const f = path.join(HERE, dir, 'ink-art.json'); if (!fs.existsSync(f)) { problems.push(`missing ${dir}/ink-art.json`); continue; }
  const frag = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [target, src, old] of [[art, frag.art || {}, before], [print, frag.print || {}, beforeP]]) {
    for (const [k, v] of flat(src)) {
      // New situation scenes (sit_<id> for a situation in cards.json) are added; any other unknown key is a mistake.
      const sitIds = JSON.parse(fs.readFileSync(path.join(REPO, 'data/cards.json'), 'utf8')).situations.map(s => 'sit_' + s.id);
      if (!old.has(k) && !(target === art && sitIds.includes(k))) { problems.push(`${dir}: unknown key ${k}`); continue; }
      const doc = parser.parseFromString(v.replace(/\{\{SID\}\}/g, 'x'), 'image/svg+xml');
      if (doc.getElementsByTagName('parsererror').length) { problems.push(`${dir}: ${k} does not parse`); continue; }
      if (old.has(k) && viewBox(v) !== viewBox(old.get(k))) problems.push(`${dir}: ${k} viewBox ${viewBox(v)} vs ${viewBox(old.get(k))}`);
      if (/\shref=/.test(v)) problems.push(`${dir}: ${k} uses href`);
      if (target === print && !v.includes('{{SID}}') && /\sid="/.test(v)) problems.push(`${dir}: print ${k} ids lack {{SID}}`);
      set(target, k, v); done.add((target === print ? 'print:' : '') + k);
    }
  }
}
const left = [...before.keys()].filter(k => !done.has(k)).concat([...beforeP.keys()].filter(k => !done.has('print:' + k)).map(k => 'print:' + k));
const bytes = JSON.stringify(art).length;
console.log(`replaced ${done.size}, untouched ${left.length}${left.length ? ': ' + left.join(' ') : ''}`);
console.log(`art.json ${(bytes / 1024).toFixed(0)} KB (was ${(JSON.stringify(Object.fromEntries([...before])).length / 1024).toFixed(0)} KB)`);
const big = flat(art).filter(([k, v]) => v.length > (viewBox(v) === '0 0 400 170' ? 22528 : 14336)).map(([k, v]) => `${k} ${(v.length / 1024).toFixed(1)}KB`);
if (big.length) console.log('over budget:', big.join(', '));
if (problems.length) console.log('PROBLEMS:\n  ' + problems.join('\n  '));
if (process.argv.includes('--write')) {
  const ind = s => (s.match(/\n( +)"/) || [, ''])[1].length || 0;
  const ra = fs.readFileSync(artP, 'utf8'), rp = fs.readFileSync(printP, 'utf8');
  fs.writeFileSync(artP, JSON.stringify(art, null, ind(ra)) + (ra.endsWith('\n') ? '\n' : ''));
  fs.writeFileSync(printP, JSON.stringify(print, null, ind(rp)) + (rp.endsWith('\n') ? '\n' : ''));
  console.log('written');
}
