// Card markup with scene art stripped, for snapshot tests. Keyword icons (16×16) stay in.
const { deck } = require('./cards');
const strip = html => html.replace(/<svg viewBox="0 0 (?!16 16)[^"]*"[\s\S]*?<\/svg>/g, '<ART/>');
module.exports = () => deck().map(([f, b]) => [strip(f), strip(b)]);
