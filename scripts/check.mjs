import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../tailwind-config.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/bootstrap-publish.yml', import.meta.url), 'utf8');
const mark = readFileSync(new URL('../assets/left-eye-mark.svg', import.meta.url), 'utf8');
const banner = readFileSync(new URL('../assets/left-eye-banner.svg', import.meta.url), 'utf8');

// Parse the local JavaScript assets without executing browser globals.
new Function(js);
new Function(config);
assert(css.length > 1000, 'External stylesheet exists and is populated');
assert(!/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html), 'No inline script blocks remain');
assert(!/\son[a-z]+\s*=/i.test(html), 'No inline event-handler attributes remain');

const ids = [...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map(m => m[1]);
const seen = new Set();
const duplicates = new Set();
for (const id of ids) {
  if (seen.has(id)) duplicates.add(id);
  seen.add(id);
}
assert.equal(duplicates.size, 0, `Duplicate HTML IDs: ${[...duplicates].join(', ')}`);

const refs = [...js.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
const missing = [...new Set(refs.filter(id => !seen.has(id)))];
assert.equal(missing.length, 0, `Missing static element IDs: ${missing.join(', ')}`);

const requiredFeatures = [
  'function toggleEyeMode(',
  'function loadPreset(',
  'function runInstantSemanticAnalyzer(',
  'function sanitizeSomaticDataset(',
  'async function toggleVoiceInput(',
  'function toggleLiveEyeSensor(',
  'function openDossierModal(',
  'textContent = r.clinical_translation',
  'installActionHandlers()',
];
for (const feature of requiredFeatures) assert(js.includes(feature), `Required feature missing: ${feature}`);

assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html + css + js), 'No third-party font requests');
assert(html.includes('Content-Security-Policy') && html.includes("connect-src 'none'"), 'CSP blocks app-initiated connection APIs');
assert(html.includes("script-src 'self' https://cdn.tailwindcss.com") && !html.includes("script-src 'self' 'unsafe-inline'"), 'CSP blocks inline scripts');
assert(html.includes('name="referrer" content="no-referrer"'), 'Referrer policy is no-referrer');
for (const src of [...html.matchAll(/<script\s+src="https:\/\/([^"]+)"([^>]*)>/g)]) {
  assert(src[2].includes('referrerpolicy="no-referrer"'), `External script suppresses referrer: ${src[0]}`);
}
assert(js.includes("typeof SpeechRec.available !== 'function'"), 'Voice requires on-device availability API');
assert(js.includes('processLocally: true') && js.includes('recognition.processLocally = true'), 'Voice processing is local-only');
assert(js.includes('Fail closed: do not fall back to a browser-managed cloud speech service'), 'Voice fail-closed fallback is explicit');
assert(!/innerHTML\s*=/i.test(js), 'No innerHTML sinks in app JavaScript');
assert(!/\bGemini\b|generativelanguage\.googleapis\.com|x-goog-api-key|customApiKeyInput|apiKey|OpenAI|OpenRouter/i.test(html + js + config), 'No AI integration or API-key handling in release');
assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|document\.cookie|localStorage|sessionStorage/i.test(js), 'No app-owned network/storage calls');
assert(workflow.includes('cp index.html app.js styles.css tailwind-config.js dist/') && workflow.includes('cp -R assets dist/assets'), 'Pages deployment includes runtime assets and favicon');
assert(html.includes('left-eye-mark.svg'), 'Favicon is referenced in HTML');
assert(mark.includes('<svg') && mark.includes('LEFT EYE'), 'Favicon SVG exists');
assert(banner.includes('<svg') && banner.includes('LEFT EYE'), 'README banner SVG exists');
assert(workflow.includes('npm test'), 'Pages deployment runs release checks');
assert(/not a diagnosis|not a diagnostic/i.test(html), 'A non-diagnostic disclaimer is present');

console.log('LEFT EYE release checks passed');
console.log(`- App JavaScript syntax: OK (${js.length.toLocaleString()} characters)`);
console.log(`- Tailwind config syntax and external CSS: OK (${css.length.toLocaleString()} characters)`);
console.log(`- Unique HTML IDs: OK (${ids.length})`);
console.log(`- getElementById references: OK (${new Set(refs).size})`);
console.log('- Privacy hardening: no app API calls/keys, no third-party fonts, no-referrer, CSP, local-only speech, no inline handlers: OK');
console.log('- Note: static checks do not replace testing on the deployed origin.');
