// The print preview page, dist/deck/preview.html: every card face at trim + bleed with toggleable guides
// (red bleed edge, black dashed trim, green 1/8 in safe zone), in three views: one card (zoomable), a grid
// of all cards, and the 9-up sheets as they print. One self-contained file: fonts and card markup are
// embedded, so it works offline from file://. Only one view is in the page at a time, so the SVG ids that
// deck() makes unique per card instance never collide.
const { fonts, guides, CW, CH, BLEED, SAFE } = require('./render');

const json = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// items: deck() pairs; info: meta(); pages: the sixteen sheet pages ({ html, cards, slots, side, label }) in print order.
module.exports = function preview(items, info, pages, { X0, Y0 }) {
  // Each sheet page with its cards swapped for tokens (side + deck index); the page script puts the markup back.
  const sheets = pages.map(p => {
    let html = p.html;
    p.cards.forEach((c, i) => { html = html.replace(c, () => `\u0001${p.side}${p.slots[i]}\u0001`); });
    return { label: p.label, html, slots: p.slots };
  });
  const cards = items.map(([f, b], i) => ({ n: i + 1, ...info[i], front: f, back: b }));
  const data = { cards, sheets, guides: guides(), layout: { CW, CH, BLEED, SAFE, X0, Y0, W: 816, H: 1056 } };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Detect the Dwellers · print preview</title>
<style>${fonts()}
:root{--ground:#141117;--panel:#1E1A21;--line:#3A323F;--ink:#F3E9E2;--mut:#B9A99E;--cy:#38E1FF;--fl:#FF5A2A;--am:#FF9B54}
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;background:var(--ground);color:var(--ink);font-family:'Chakra Petch',sans-serif;font-weight:500;font-size:14px;line-height:1.4}
::selection{background:var(--cy);color:#07060A}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--ground)}::-webkit-scrollbar-thumb{background:var(--line)}
header{position:sticky;top:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}
h1{margin:0 8px 0 0;font-size:16px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.group{display:flex;gap:6px;align-items:center}
label,.lbl{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
.seg{display:flex;border:1px solid var(--line)}
.seg button{font:inherit;font-weight:700;font-size:13px;color:var(--mut);background:transparent;border:0;padding:5px 12px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--cy);color:#07060A}
.seg button:not([aria-pressed="true"]):hover{color:var(--ink)}
select,input[type=range]{font:inherit;font-size:13px;color:var(--ink);background:var(--ground);border:1px solid var(--line);padding:4px 6px;accent-color:var(--cy)}
select{max-width:260px}
input[type=checkbox]{accent-color:var(--cy);width:16px;height:16px;margin:0}
button.step{font:inherit;font-weight:700;color:var(--ink);background:transparent;border:1px solid var(--line);padding:4px 10px;cursor:pointer}
button.step:hover{border-color:var(--mut)}
:focus-visible{outline:2px solid var(--cy);outline-offset:2px}
.legend{display:flex;gap:14px;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
.legend i{display:inline-block;width:18px;height:0;vertical-align:middle;margin-right:6px;border-top:2px solid}
main{padding:24px 16px 48px;overflow-x:auto}
.caption{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:12px;letter-spacing:.04em;color:var(--mut);margin:0 0 12px;font-variant-numeric:tabular-nums}
.caption b{color:var(--ink);font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:15px;letter-spacing:.01em;text-transform:uppercase;margin-right:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:24px 16px}
.grid figure{margin:0;cursor:pointer;justify-self:center}
.grid figure:hover .bleed{outline:2px solid var(--cy)}
.grid figcaption{margin-top:6px;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);max-width:264px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grid figcaption span{color:var(--ink)}
.scaled{position:relative}
.scaled>div{position:absolute;left:0;top:0;transform-origin:0 0}
.sheet-wrap{box-shadow:0 6px 24px rgba(0,0,0,.5)}
.hide{display:none!important}
</style>
</head>
<body>
<header>
<h1>Print preview</h1>
<div class="seg" role="group" aria-label="View"><button data-view="single">Single</button><button data-view="grid">Grid</button><button data-view="sheet">Sheet</button></div>
<div class="seg" role="group" aria-label="Side"><button data-side="front">Fronts</button><button data-side="back">Backs</button></div>
<div class="group"><input type="checkbox" id="guides" checked><label for="guides">Guides</label></div>
<div class="group"><label for="type">Type</label><select id="type"></select></div>
<div class="group" id="g-card"><button class="step" id="prev" aria-label="Previous card">‹</button><select id="card" aria-label="Card"></select><button class="step" id="next" aria-label="Next card">›</button></div>
<div class="group" id="g-sheet"><label for="sheet">Sheet</label><select id="sheet"></select></div>
<div class="group" id="g-zoom"><label for="zoom">Zoom</label><input type="range" id="zoom" min="0.5" max="4" step="0.25"><span class="lbl" id="zoomv"></span></div>
<div class="legend" id="legend"><span><i style="border-color:#E0002A"></i>Bleed</span><span><i style="border-color:#000;border-top-style:dashed;background:#fff"></i>Trim</span><span><i style="border-color:#00A050"></i>Safe</span></div>
</header>
<main id="stage"></main>
<script>
const DATA = ${json(data)};
const L = DATA.layout, FW = L.CW + 2 * L.BLEED, FH = L.CH + 2 * L.BLEED;
const S = { view: 'single', side: 'front', guides: true, type: 'all', card: 0, sheet: 0, zoom: { single: 2, sheet: 1 } };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ground = html => (html.match(/^<div class="card" style="[^"]*?background: (#[0-9A-Fa-f]{6})/) || [, '#F6F2EC'])[1];
const face = html => '<div class="bleed" style="position: relative; width: ' + FW + 'px; height: ' + FH + 'px; overflow: hidden; background: ' + ground(html) + '; color: #1A1418; font-family: \\'Chakra Petch\\', sans-serif; font-weight: 500"><div style="position: absolute; left: ' + L.BLEED + 'px; top: ' + L.BLEED + 'px">' + html + '</div>' + (S.guides ? DATA.guides : '') + '</div>';
const scaled = (inner, w, h, z, cls = '') => '<div class="scaled ' + cls + '" style="width: ' + w * z + 'px; height: ' + h * z + 'px"><div style="transform: scale(' + z + ')">' + inner + '</div></div>';
const types = [...new Set(DATA.cards.map(c => c.type))];
const shown = () => DATA.cards.filter(c => S.type === 'all' || c.type === S.type);
const pick = c => S.side === 'front' ? c.front : c.back;

function sheetGuides(slots) {
  const out = [];
  if (S.guides) {
    out.push('<rect x="' + (L.X0 - L.BLEED + .5) + '" y="' + (L.Y0 - L.BLEED + .5) + '" width="' + (3 * L.CW + 2 * L.BLEED - 1) + '" height="' + (3 * L.CH + 2 * L.BLEED - 1) + '" fill="none" stroke="#E0002A"/>');
    for (let i = 0; i < 9; i++) {
      const x = L.X0 + (i % 3) * L.CW, y = L.Y0 + Math.floor(i / 3) * L.CH;
      out.push('<rect x="' + x + '" y="' + y + '" width="' + L.CW + '" height="' + L.CH + '" fill="none" stroke="#FFF" stroke-width="0.75"/><rect x="' + x + '" y="' + y + '" width="' + L.CW + '" height="' + L.CH + '" fill="none" stroke="#000" stroke-width="0.75" stroke-dasharray="4 3"/>');
      out.push('<rect x="' + (x + L.SAFE) + '" y="' + (y + L.SAFE) + '" width="' + (L.CW - 2 * L.SAFE) + '" height="' + (L.CH - 2 * L.SAFE) + '" fill="none" stroke="#00A050" stroke-width="0.75"/>');
    }
  }
  // Cards outside the type filter are veiled, so the filter still reads on a sheet.
  slots.forEach((n, i) => { if (S.type !== 'all' && DATA.cards[n].type !== S.type) out.push('<rect x="' + (L.X0 + (i % 3) * L.CW) + '" y="' + (L.Y0 + Math.floor(i / 3) * L.CH) + '" width="' + L.CW + '" height="' + L.CH + '" fill="#141117" opacity=".7"/>'); });
  return '<svg width="' + L.W + '" height="' + L.H + '" style="position: absolute; left: 0; top: 0; pointer-events: none" aria-hidden="true">' + out.join('') + '</svg>';
}

function render() {
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
  document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-pressed', b.dataset.side === S.side));
  $('g-card').classList.toggle('hide', S.view !== 'single');
  $('g-sheet').classList.toggle('hide', S.view !== 'sheet');
  $('g-zoom').classList.toggle('hide', S.view === 'grid');
  $('legend').classList.toggle('hide', !S.guides);
  const list = shown();
  if (!list.some(c => c.n - 1 === S.card)) S.card = list.length ? list[0].n - 1 : 0;
  $('card').innerHTML = list.map(c => '<option value="' + (c.n - 1) + '"' + (c.n - 1 === S.card ? ' selected' : '') + '>' + String(c.n).padStart(2, '0') + ' · ' + esc(c.name) + '</option>').join('');
  const z = S.zoom[S.view === 'sheet' ? 'sheet' : 'single'];
  $('sheet').value = S.sheet; $('type').value = S.type;
  $('zoom').value = z; $('zoomv').textContent = Math.round(z * 100) + '%';
  const stage = $('stage');
  if (S.view === 'single') {
    const c = DATA.cards[S.card];
    stage.innerHTML = '<p class="caption"><b>' + esc(c.name) + '</b>#' + String(c.n).padStart(2, '0') + ' of ' + DATA.cards.length + ' · ' + esc(c.type) + ' · ' + S.side + ' · 2.75 × 3.75 in with bleed</p>' + scaled(face(pick(c)), FW, FH, z);
  } else if (S.view === 'grid') {
    stage.innerHTML = '<p class="caption">' + list.length + ' card' + (list.length === 1 ? '' : 's') + ' · ' + S.side + 's · trim + 1/8 in bleed</p><div class="grid">' + list.map(c => '<figure data-n="' + (c.n - 1) + '">' + face(pick(c)) + '<figcaption>' + String(c.n).padStart(2, '0') + ' · <span>' + esc(c.name) + '</span></figcaption></figure>').join('') + '</div>';
  } else {
    const sh = DATA.sheets[S.sheet * 2 + (S.side === 'back' ? 1 : 0)];
    const html = sh.html.replace(/\\u0001([fb])(\\d+)\\u0001/g, (m, s, n) => s === 'f' ? DATA.cards[n].front : DATA.cards[n].back);
    stage.innerHTML = '<p class="caption"><b>' + esc(sh.label) + '</b>Letter 8.5 × 11 in · ' + (S.side === 'back' ? 'mirrored to register on a long-edge flip' : 'print at 100%, then its backs on the reverse') + '</p>' + scaled('<div style="position: relative; background: #fff">' + html + sheetGuides(sh.slots) + '</div>', L.W, L.H, z, 'sheet-wrap');
  }
}

$('type').innerHTML = '<option value="all">All types</option>' + types.map(t => '<option value="' + t + '">' + t + '</option>').join('');
$('sheet').innerHTML = DATA.sheets.filter((_, i) => i % 2 === 0).map((_, i) => '<option value="' + i + '">Sheet ' + (i + 1) + ' of ' + DATA.sheets.length / 2 + '</option>').join('');
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { S.view = b.dataset.view; render(); });
document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { S.side = b.dataset.side; render(); });
$('guides').onchange = e => { S.guides = e.target.checked; render(); };
$('type').onchange = e => { S.type = e.target.value; render(); };
$('card').onchange = e => { S.card = +e.target.value; render(); };
$('sheet').onchange = e => { S.sheet = +e.target.value; render(); };
$('zoom').oninput = e => { S.zoom[S.view === 'sheet' ? 'sheet' : 'single'] = +e.target.value; render(); };
const step = d => { const l = shown(), i = l.findIndex(c => c.n - 1 === S.card); if (l.length) { S.card = l[(i + d + l.length) % l.length].n - 1; render(); } };
$('prev').onclick = () => step(-1); $('next').onclick = () => step(1);
document.addEventListener('keydown', e => { if (S.view === 'single' && e.target.tagName !== 'SELECT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) step(e.key === 'ArrowLeft' ? -1 : 1); });
$('stage').addEventListener('click', e => { const f = e.target.closest('figure[data-n]'); if (f) { S.card = +f.dataset.n; S.view = 'single'; render(); scrollTo(0, 0); } });
const q = new URLSearchParams(location.search);
if (['single', 'grid', 'sheet'].includes(q.get('view'))) S.view = q.get('view');
if (q.get('side') === 'back') S.side = 'back';
if (q.get('guides') === '0') { S.guides = false; $('guides').checked = false; }
if (q.get('card')) S.card = Math.min(DATA.cards.length - 1, Math.max(0, +q.get('card') - 1 || 0));
if (q.get('sheet')) S.sheet = Math.min(DATA.sheets.length / 2 - 1, Math.max(0, +q.get('sheet') - 1 || 0));
render();
</script>
</body>
</html>
`;
};
