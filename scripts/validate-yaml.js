// Simple YAML validation for GitHub workflow files (ESM)
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const workflowDir = path.join(process.cwd(), '.github', 'workflows');

function validate(file) {
  const full = path.join(workflowDir, file);
  const src = fs.readFileSync(full, 'utf8');
  try {
    const doc = yaml.load(src);
    const missing = [];
    if (!doc || typeof doc !== 'object') {
      console.error(`[FAIL] ${file}: YAML parsed to non-object`);
      return false;
    }
    if (!('on' in doc)) missing.push('on');
    if (!('jobs' in doc)) missing.push('jobs');
    if (missing.length) {
      console.error(`[FAIL] ${file}: missing top-level keys: ${missing.join(', ')}`);
      return false;
    }
    console.log(`[OK]   ${file}`);
    return true;
  } catch (e) {
    console.error(`[ERROR] ${file}: ${e.message}`);
    return false;
  }
}

const files = fs.readdirSync(workflowDir).filter(f => /\.(yml|yaml)$/.test(f));
let allOk = true;
for (const f of files) {
  const ok = validate(f);
  if (!ok) allOk = false;
}
if (!allOk) {
  process.exitCode = 1;
  console.log('\nOne or more workflow files invalid.');
} else {
  console.log('\nAll workflow files valid.');
}
