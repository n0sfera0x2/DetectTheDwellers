#!/usr/bin/env node
// Audio scaffold check (2026-11-25): lists which clips in prompts.json are generated, checks that every
// analyst, alarm, boss, agent and consumable has its sounds, and estimates the ElevenLabs credits left.
// Run: node game/audio/status.js   (exit 1 if a card has no sound entry)
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const P = require('./prompts.json');
const S = require('../art/sprites/prompts.json').sprites;

const has = f => fs.existsSync(path.join(DIR, f));
// ElevenLabs estimates (2026-11-25, Starter plan, one take each): sound effects about 3.4 credits a
// second at most (eleven_text_to_sound_v3; a 1.2 s clip charged 4), music 15 a second charged, 25 estimated (eleven_music_v2_5).
// Check the live price with estimate_only before spending.
const sfxCost = s => Math.ceil(s * 3.4);
const musicCost = s => Math.ceil(s * 15);

let left = 0, done = 0, todo = [];
for (const [id, c] of Object.entries(P.sfx)) {
  if (has(`sfx/${id}.mp3`) || has(`sfx/${id}.wav`)) done++; else { left += sfxCost(c.seconds); todo.push(id); }
}
const sfxN = Object.keys(P.sfx).length;
let mDone = 0, mTodo = [];
for (const [id, c] of Object.entries(P.music)) {
  if (has(`music/${id}.mp3`)) mDone++; else { left += musicCost(c.length_s); mTodo.push(id); }
}
const mN = Object.keys(P.music).length;

// Coverage: each card kind needs these clips.
const need = { analyst: id => [`ability_${id}`], alarm: id => [`${id}_arrive`, `${id}_strike`], boss: id => [`${id}_arrive`, `${id}_strike`, `${id}_down`], agent: id => [`agent_${id}`], consumable: id => [`item_${id}`] };
const missing = [];
for (const [id, s] of Object.entries(S)) { const f = need[s.kind]; if (f) f(id).forEach(k => { if (!P.sfx[k]) missing.push(k); }); }
for (const id of Object.keys(S)) if (S[id].kind === 'boss' && !P.music[`boss_${id}`]) missing.push(`music boss_${id}`);

console.log(`sound effects ${done}/${sfxN}, music ${mDone}/${mN}`);
console.log(`ElevenLabs credits still to spend: about ${left}`);
if (todo.length) console.log(`sounds to make: ${todo.join(' ')}`);
if (mTodo.length) console.log(`music to make: ${mTodo.join(' ')}`);
console.log(missing.length ? `MISSING entries for cards: ${missing.join(' ')}` : 'every card has its sound entries');
process.exitCode = missing.length ? 1 : 0;
