const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { parseResultsFromHtml } = require('./predictor-app');

const sampleHtml = `
<div class="outerbox">
  <table>
    <tr><td>Jaguar J (3pm)</td></tr>
    <tr><td>Date: 2026-07-16 (Thu)</td></tr>
    <tr><td><span class="resulttop">4363</span></td></tr>
    <tr><td><span class="resultbottom">7421</span></td></tr>
  </table>
</div>
<div class="outerbox">
  <table>
    <tr><td>Jaguar G (9pm)</td></tr>
    <tr><td>Date: 2026-07-16 (Thu)</td></tr>
    <tr><td><span class="resulttop">1184</span></td></tr>
    <tr><td><span class="resultbottom">9987</span></td></tr>
  </table>
</div>`;

const entries = parseResultsFromHtml(sampleHtml);
assert.strictEqual(entries.length, 2, `Expected 2 entries, got ${entries.length}`);
assert.deepStrictEqual(entries.map((entry) => entry.type), ['3pm', '9pm']);
assert.deepStrictEqual(entries[0].numbers, ['4363', '7421']);
assert.deepStrictEqual(entries[1].numbers, ['1184', '9987']);

(async () => {
  const storage = {};
  const localStorage = {
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; },
  };

  const elements = {
    importUrl: { value: 'http://live4d.jaguar20.biz/jaguarlive4d/' },
    historyList: { innerHTML: '' },
    predictionsArea: { innerHTML: '' },
    toast: { textContent: '', className: '', classList: { add() {}, remove() {} } },
  };

  const document = {
    getElementById(id) { return elements[id] || null; },
    addEventListener() {},
  };

  const code = fs.readFileSync('./predictor-app.js', 'utf8');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    document,
    localStorage,
    Date,
    fetch: async () => ({
      ok: true,
      text: async () => sampleHtml,
    }),
    setTimeout: () => {},
    confirm: () => true,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  await sandbox.importFromLink();
  const saved = JSON.parse(localStorage.getItem('j2_mcboy_predictor_v2'));
  assert.ok(saved && saved.history, 'Expected history to be saved');
  assert.strictEqual(saved.history.length, 2, `Expected 2 saved entries, got ${saved.history.length}`);
  assert.deepStrictEqual(saved.history.map((entry) => entry.type), ['3pm', '9pm']);
  console.log('importer save test passed');
})();
