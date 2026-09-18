import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Node 22.19 exposes a global localStorage placeholder that is unavailable
// unless a --localstorage-file is supplied. Component tests run in jsdom and
// should consistently use jsdom's browser storage instead.
function installBrowserStorage(): void {
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  if (!localStorageDescriptor || localStorageDescriptor.configurable) Object.defineProperty(globalThis, "localStorage", { configurable: true, value: window.localStorage });

  const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  if (!sessionStorageDescriptor || sessionStorageDescriptor.configurable) Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: window.sessionStorage });
}

installBrowserStorage();
beforeEach(installBrowserStorage);
