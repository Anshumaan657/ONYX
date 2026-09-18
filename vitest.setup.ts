import "@testing-library/jest-dom/vitest";

// Node 22.19 exposes a global localStorage placeholder that is unavailable
// unless a --localstorage-file is supplied. Component tests run in jsdom and
// should consistently use jsdom's browser storage instead.
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: window.localStorage,
});

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: window.sessionStorage,
});
