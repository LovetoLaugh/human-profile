const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the actual root/page/provider with no loaded profile and no Clerk configuration.
// Only Next's routing primitives are replaced; profile loading/gating is the real component.
function load(relative) {
 const filename = path.resolve(relative);
 const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 const module = { exports: {} };
 vm.runInNewContext(code, { module, URL, exports: module.exports, require: id => {
  if (id === 'react' || id === 'react/jsx-runtime') return require(id);
  if (id.endsWith('.css')) return {};
  if (id === 'next/navigation') return { usePathname: () => '/' };
  if (id === 'next/link') return { default: ({ children, href, className }) => React.createElement('a', { href, className }, children), __esModule: true };
  if (id === '@/components/Dashboard') return { Dashboard: () => { throw new Error('Data-dependent dashboard must not render before data'); } };
  if (id.startsWith('@/')) return load(`${id.slice(2)}.tsx`);
  if (id.startsWith('.')) return load(`${path.resolve(path.dirname(filename), id)}.tsx`);
  throw new Error(`Unexpected initial-render dependency: ${id}`);
 }});
 return module.exports;
}
test('anonymous home SSR contains one meaningful intro while real provider has no profile data', () => {
 const { default: Layout } = load('app/layout.tsx');
 const { default: Home } = load('app/page.tsx');
 const html = renderToStaticMarkup(React.createElement(Layout, null, React.createElement(Home)));
 for (const phrase of ['Human Profile', 'People. Context. Trust.', 'Understand human context through evidence, patterns, and purpose-based sharing.', 'Interactive prototype · Fictional demo data', 'Continue with Google']) assert.ok(html.includes(phrase), phrase);
 assert.equal((html.match(/id="demo-title"/g) || []).length, 1);
 assert.doesNotMatch(html, /Loading profile/);
 assert.ok(html.includes('Preparing your profile'));
 assert.doesNotMatch(fs.readFileSync('app/page.tsx', 'utf8'), /use client|@clerk/);
});
