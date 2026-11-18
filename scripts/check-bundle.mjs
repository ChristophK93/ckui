// Builds the bundle probe against the built package (dist/ckui/core, resolved through its
// package.json exports like a real app) and checks that CDK overlay code stays out of the initial
// bundle while button, field and toast are used there. Run `npm run build:lib` first.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const library = join(root, 'dist', 'ckui', 'core');
const probeLink = join(root, 'projects', 'bundle-probe', 'node_modules', '@ckui', 'core');
const output = join(root, 'dist', 'bundle-probe', 'browser');
// `cdk-overlay-container` is left out: the CDK live announcer in a11y mentions it too.
const OVERLAY_MARKERS = ['cdk-global-overlay-wrapper', 'cdk-overlay-backdrop', 'cdk-overlay-pane'];

if (!existsSync(join(library, 'package.json'))) {
  console.error('check-bundle: dist/ckui/core is missing, run `npm run build:lib` first.');
  process.exit(1);
}

// Removes only the link itself, never what it points at: a recursive delete through a junction
// would empty the target.
function removeProbeLink() {
  let stats;
  try {
    stats = lstatSync(probeLink);
  } catch {
    return;
  }
  if (!stats.isSymbolicLink()) {
    console.error(`check-bundle: ${probeLink} exists and is not a link; remove it by hand.`);
    process.exit(1);
  }
  unlinkSync(probeLink);
}

// A link inside the probe shadows the workspace link (which points at the sources).
removeProbeLink();
mkdirSync(dirname(probeLink), { recursive: true });
symlinkSync(library, probeLink, 'junction');

rmSync(join(root, 'dist', 'bundle-probe'), { recursive: true, force: true });
const ng = join(root, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
try {
  execFileSync(process.execPath, [ng, 'build', 'bundle-probe'], { cwd: root, stdio: 'inherit' });
} finally {
  removeProbeLink();
}

const read = (name) => readFileSync(join(output, name), 'utf8');
const html = read('index.html');
const initial = new Set();

function addInitial(name) {
  const file = name.replace(/^\.?\//, '');
  if (initial.has(file) || !existsSync(join(output, file))) return;
  initial.add(file);
  // Static imports only; `import('./x.js')` is a lazy chunk.
  for (const match of read(file).matchAll(/(?:\bfrom|\bimport)\s*["'](\.\/[^"']+\.js)["']/g)) {
    addInitial(match[1]);
  }
}

for (const match of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+\.js)"/g)) {
  addInitial(match[1]);
}

const hasOverlay = (name) => OVERLAY_MARKERS.some((marker) => read(name).includes(marker));
const lazy = readdirSync(output).filter((name) => name.endsWith('.js') && !initial.has(name));
const initialBytes = [...initial].reduce(
  (sum, name) => sum + lstatSync(join(output, name)).size,
  0,
);

console.log(`\ninitial files (${(initialBytes / 1024).toFixed(1)} kB):`);
for (const name of initial)
  console.log(`  ${name}${hasOverlay(name) ? '  <- contains overlay code' : ''}`);
console.log('lazy files:');
for (const name of lazy)
  console.log(`  ${name}${hasOverlay(name) ? '  <- contains overlay code' : ''}`);

const leaked = [...initial].filter(hasOverlay);
let failed = false;
if (leaked.length > 0) {
  console.error(`\ncheck-bundle: CDK overlay code is in the initial bundle: ${leaked.join(', ')}`);
  failed = true;
}
if (!lazy.some(hasOverlay)) {
  console.error(
    '\ncheck-bundle: no lazy chunk contains the overlay code, the probe proves nothing.',
  );
  failed = true;
}
if (initial.size === 0) {
  console.error('\ncheck-bundle: found no initial files in index.html.');
  failed = true;
}
if (failed) process.exit(1);
console.log(
  `\ncheck-bundle: ok, initial ${(initialBytes / 1024).toFixed(1)} kB without overlay code.`,
);
