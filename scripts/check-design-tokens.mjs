/** Model B drift gate: approved JSON -> documented mirror -> explicit CSS adapter.
 * This intentionally does not claim to audit every feature/illustration literal.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const tokens = JSON.parse(read('src/app/design-tokens.json'));
const design = read('DESIGN.md');
const css = read('src/app/global.css');
const errors = [];
let checks = 0;
function assert(condition, message) {
  checks++;
  if (!condition) errors.push(message);
}
const equal = (actual, expected, label) =>
  assert(
    String(actual).toLowerCase() === String(expected).toLowerCase(),
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
function parseFrontmatter(source) {
  const block = source.match(/^---\n([\s\S]*?)\n---/);
  assert(Boolean(block), 'DESIGN.md must begin with token frontmatter');
  const out = {},
    stack = [{ depth: -1, node: out }];
  for (const line of (block?.[1] || '').split('\n')) {
    const match = line.match(/^( *)([\w-]+):(?:\s+(.*))?$/);
    if (!match) continue;
    const depth = match[1].length;
    while (stack.length > 1 && depth <= stack.at(-1).depth) stack.pop();
    const parent = stack.at(-1).node;
    if (match[3] === undefined) {
      parent[match[2]] = {};
      stack.push({ depth, node: parent[match[2]] });
    } else parent[match[2]] = match[3].replace(/^['"]|['"]$/g, '');
  }
  return out;
}
const doc = parseFrontmatter(design);
for (const [key, value] of Object.entries(tokens.colors))
  equal(doc.colors?.[key], value, `DESIGN colors.${key}`);
for (const [key, value] of Object.entries(tokens.radius))
  equal(doc.rounded?.[key], `${value}px`, `DESIGN rounded.${key}`);
for (const value of tokens.spacing)
  equal(doc.spacing?.[`step-${value}`], `${value}px`, `DESIGN spacing.step-${value}`);
equal(
  doc.typography?.body?.fontFamily,
  `${tokens.font.family}, ${tokens.font.fallback}`,
  'DESIGN body family',
);
equal(doc.typography?.body?.fontSize, `${tokens.font.bodyPx}px`, 'DESIGN body size');
equal(doc.typography?.body?.lineHeight, tokens.font.lineHeight, 'DESIGN body leading');
equal(doc.typography?.utility?.fontSize, `${tokens.font.smallPx}px`, 'DESIGN utility size');
equal(
  doc.typography?.utility?.fontFamily,
  `${tokens.font.family}, ${tokens.font.fallback}`,
  'DESIGN utility family',
);
equal(doc.typography?.utility?.lineHeight, tokens.font.lineHeight, 'DESIGN utility leading');
const semantic = {
  canvas: '--canvas',
  surface: '--surface',
  raised: '--surface-raised',
  text: '--text',
  textSecondary: '--text-secondary',
  primary: '--forest',
  accent: '--clay',
  border: '--border',
  successBackground: '--success-bg',
  successText: '--success',
  warningBackground: '--warning-bg',
  warningText: '--warning',
  dangerBackground: '--danger-bg',
  dangerText: '--danger',
  infoBackground: '--info-bg',
  infoText: '--info',
};
const cssVariables = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1], m[2].trim()]),
);
for (const [key, variable] of Object.entries(semantic))
  equal(cssVariables[variable], tokens.colors[key], `CSS ${variable}`);
equal(cssVariables['--radius'], `${tokens.radius.card}px`, 'CSS card radius');
function firstRule(selector) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === selector)?.[2] || '';
}
function property(rule, name) {
  return rule.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;}]+)`))?.[1]?.trim();
}
equal(property(firstRule('body'), 'font-size'), `${tokens.font.bodyPx}px`, 'CSS body size');
equal(property(firstRule('body'), 'line-height'), tokens.font.lineHeight, 'CSS body leading');
equal(property(firstRule('.button'), 'border-radius'), `${tokens.radius.control}px`, 'CSS button radius');
equal(
  property(firstRule('.button'), 'min-height'),
  `${tokens.controlHeight.desktop}px`,
  'CSS desktop button height',
);
equal(property(firstRule('.chip'), 'border-radius'), `${tokens.radius.pill}px`, 'CSS chip radius');
equal(property(firstRule('.dialog'), 'border-radius'), `${tokens.radius.panel}px`, 'CSS dialog radius');
const focus =
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].includes('button:focus-visible'))?.[2] || '';
assert(
  (property(focus, 'outline') || '').toLowerCase().includes(tokens.colors.focus.toLowerCase()),
  'CSS focus outline does not use approved focus color',
);
const buttonTransition = property(firstRule('.button'), 'transition') || '';
assert(
  buttonTransition.includes(`${tokens.motionMs.feedback}ms`) ||
    buttonTransition.includes(`${tokens.motionMs.feedback / 1000}s`) ||
    buttonTransition.includes(`.${String(tokens.motionMs.feedback / 10)}s`),
  'CSS shared button feedback duration does not use canonical motionMs.feedback',
);
assert(
  css.includes('scrollbar-color:') || css.includes('scrollbar-color :'),
  'Global scrollbar-color missing',
);
assert(
  css.includes('scrollbar-width:') || css.includes('scrollbar-width :'),
  'Global scrollbar-width missing',
);
assert(
  css.includes('@media(prefers-reduced-motion:reduce)') ||
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css),
  'Global reduced-motion rule missing',
);
const report = {
  source: 'src/app/design-tokens.json',
  checks,
  errors,
  coverage:
    'All mirrored tokens, explicit global semantic adapter, primary shared typography/control recipes. Scene/illustration materials and feature geometry require visual review.',
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
