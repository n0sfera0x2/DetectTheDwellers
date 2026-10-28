// JSON serializer matching Python's json.dumps defaults (", " and ": " separators).
// The page has always been built this way; keeping it makes builds byte-stable.
function pyjson(v, asciiOnly = false) {
  if (Array.isArray(v)) return '[' + v.map(x => pyjson(x, asciiOnly)).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => str(k, asciiOnly) + ': ' + pyjson(x, asciiOnly)).join(', ') + '}';
  if (typeof v === 'string') return str(v, asciiOnly);
  return JSON.stringify(v);
}
function str(s, asciiOnly) {
  const j = JSON.stringify(s);
  return asciiOnly ? j.replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) : j;
}
module.exports = pyjson;
