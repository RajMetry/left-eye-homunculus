import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function section(start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  assert(i >= 0 && j > i, `Could not locate source section ${start}`);
  return source.slice(i, j);
}

const safeHelpers = [
  section('function safeDisplayText(', '\n    function sanitizeSomaticDataset('),
  section('function sanitizeSomaticDataset(', '\n    function applySomaticDataset('),
  section('function runInstantSemanticAnalyzer(', '\n    /* =========================================================================\n       8. APPLY DATASET TO 3D HOMUNCULUS & CLINICAL BRIDGE UI'),
].join('\n');
const context = {
  VALID_BODY_PARTS: ['Head', 'Neck', 'Chest', 'Abdomen', 'LeftArm', 'RightArm', 'LeftHand', 'RightHand', 'Legs'],
  VALID_SHADERS: ['RUST_METAL', 'SAND_STATIC', 'WATER', 'GLASS_FRACTURE', 'SMOKE_VOID', 'NORMAL'],
};
vm.runInNewContext(`${safeHelpers}\nthis.safeDisplayText = safeDisplayText; this.sanitizeSomaticDataset = sanitizeSomaticDataset; this.runInstantSemanticAnalyzer = runInstantSemanticAnalyzer;`, context);

const chestAndHand = context.runInstantSemanticAnalyzer('My chest feels like iron and my left hand is numb.');
assert(chestAndHand.regions.some(r => r.body_part === 'Chest'), 'Chest keyword maps to Chest');
assert(chestAndHand.regions.some(r => r.body_part === 'LeftHand'), 'Left-hand wording maps to LeftHand');
assert(!chestAndHand.regions.some(r => r.body_part === 'Legs'), 'Heavy chest wording should not map to Legs');

const rightHand = context.runInstantSemanticAnalyzer('My right hand feels cold.');
assert(rightHand.regions.some(r => r.body_part === 'RightHand'), 'Right-hand wording maps to RightHand');
const leftArm = context.runInstantSemanticAnalyzer('My left arm has an electric buzzing feeling.');
assert(leftArm.regions.some(r => r.body_part === 'LeftArm'), 'Left-arm wording maps to LeftArm');
assert(!leftArm.regions.some(r => r.body_part === 'Head'), 'An arm buzzing metaphor must not automatically invent a head region');
const unmapped = context.runInstantSemanticAnalyzer('Hello, I am testing this interface.');
assert.equal(unmapped.regions.length, 0, 'Unrelated text must not invent body regions');
assert.equal(unmapped.distortion_index, 0, 'Unmapped text does not invent a score');

const malicious = '<img src=x onerror=alert(1)>';
const clean = context.sanitizeSomaticDataset({
  patient_quote: malicious,
  overall_homunculus_archetype: malicious,
  distortion_index: 999,
  regions: [
    { body_part: 'Script', scale_multiplier: 999, material_shader: 'BAD', patient_metaphor: malicious, clinical_translation: malicious },
    { body_part: 'Head', scale_multiplier: 999, material_shader: 'BAD', patient_metaphor: malicious, clinical_translation: malicious },
  ],
  clinician_questions: [malicious],
});
assert.equal(clean.regions.length, 1, 'Unknown body parts are rejected');
assert.equal(clean.regions[0].scale_multiplier, 2.5, 'Scale is clamped to the allowed range');
assert.equal(clean.regions[0].material_shader, 'NORMAL', 'Unknown shaders are neutralized');
assert.equal(clean.distortion_index, 100, 'Projection score is clamped');
assert.equal(clean.regions[0].patient_metaphor, malicious, 'User-like text remains plain data for safe textContent rendering');
assert(!/innerHTML\s*=\s*`/.test(source), 'Dynamic model/user text is not assigned through template-string innerHTML');

console.log('Local-engine unit checks passed');
console.log('- Body keyword mappings (chest/left hand/right hand/left arm): OK');
console.log('- Unmapped text remains unmapped: OK');
console.log('- Dataset validation, bounds, and text safety: OK');
