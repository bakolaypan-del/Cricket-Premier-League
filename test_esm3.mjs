globalThis.window = {
  addEventListener: () => {},
  dispatchEvent: () => {},
  location: { pathname: '/', search: '', hash: '', origin: 'http://localhost:8080' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, classList: { add: () => {}, remove: () => {} }, style: {} }),
  body: { appendChild: () => {}, insertAdjacentHTML: () => {} },
  readyState: 'complete'
};
globalThis.localStorage = globalThis.window.localStorage;
globalThis.sessionStorage = globalThis.window.sessionStorage;
globalThis.CustomEvent = class { constructor(n, opt) { this.name = n; this.detail = opt?.detail; } };

async function testImports() {
  try {
    await import('./js/supabase.js?v=12.0.2');
    await import('./js/store.js?v=12.0.2');
    await import('./js/admin.js?v=12.0.2');
    await import('./js/app_v9.js?v=12.0.2');
    console.log('✅ ALL MODULES LOADED WITH ZERO ERRORS');
  } catch (err) {
    console.error('❌ ESM Load Error:', err);
  }
}
testImports();
