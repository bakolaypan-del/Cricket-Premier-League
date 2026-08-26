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
    console.log('1. Loading supabase.js...');
    await import('./js/supabase.js?v=12.0.1');
    console.log('✅ supabase.js OK');

    console.log('2. Loading store.js...');
    await import('./js/store.js?v=12.0.1');
    console.log('✅ store.js OK');

    console.log('3. Loading admin.js...');
    await import('./js/admin.js?v=12.0.1');
    console.log('✅ admin.js OK');

    console.log('4. Loading app_v9.js...');
    await import('./js/app_v9.js?v=12.0.1');
    console.log('✅ app_v9.js OK');
  } catch (err) {
    console.error('❌ ESM Load Error:', err);
  }
}
testImports();
