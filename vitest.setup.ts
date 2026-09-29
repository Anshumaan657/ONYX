import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Recent Node versions expose a global localStorage placeholder that is
// unavailable unless a --localstorage-file is supplied. Component tests run
// in jsdom and should consistently use browser-like storage instead.
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

const fallbackLocalStorage = createMemoryStorage();
const fallbackSessionStorage = createMemoryStorage();

function readStorage(kind: "localStorage" | "sessionStorage", fallback: Storage): Storage {
  try {
    return window[kind] ?? fallback;
  } catch {
    return fallback;
  }
}

function installBrowserStorage(): void {
  const localStorage = readStorage("localStorage", fallbackLocalStorage);
  const sessionStorage = readStorage("sessionStorage", fallbackSessionStorage);

  Object.defineProperty(window, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: sessionStorage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage });
}

installBrowserStorage();
beforeEach(installBrowserStorage);
