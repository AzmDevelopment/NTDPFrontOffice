import fs from 'fs';
const files = [
  '.github/workflows/deploy.yml',
  '.github/workflows/playwright-ci.yml'
];
for (const f of files) {
  const buf = fs.readFileSync(f);
  const first = Array.from(buf.slice(0,64)).map(b=>b.toString(16).padStart(2,'0')).join(' ');
  console.log(`FILE: ${f}`);
  console.log(`SIZE: ${buf.length} bytes`);
  console.log(`HEAD: ${first}`);
  console.log('---');
}