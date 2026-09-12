const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const cache = new Map();

// Use the existing TypeScript compiler and Node test runner; no added test dependencies.
function loadTypeScript(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(root + path.sep)) throw new Error('Only project modules may be loaded.');
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, {
    exports: module.exports, module, Date, structuredClone, setTimeout, URL,
    require: id => {
      if (id.startsWith('node:')) return require(id);
      const resolved = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      return loadTypeScript(resolved.endsWith('.ts') ? resolved : resolved + '.ts');
    },
  }, { filename });
  return module.exports;
}
module.exports = { loadTypeScript, plain: value => JSON.parse(JSON.stringify(value)) };
