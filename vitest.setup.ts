// Registers the jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) on
// Vitest's `expect` for every test file in the unit project (ADR 0007).
import "@testing-library/jest-dom/vitest";

// jsdom ships no ResizeObserver; Radix primitives (Tooltip, Popover, …) measure with it
// on mount. A minimal no-op stub lets those primitives render in the jsdom unit project
// (the real API backs the browser-mode story tests). ADR 0007.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom implements no layout, so Element.scrollIntoView is absent; cmdk (Command) calls
// it to keep the active row in view. A no-op keeps the jsdom unit project green (the real
// method backs the browser-mode story tests). ADR 0007.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom ships no matchMedia; Motion's `useReducedMotion` reads it (ADR 0096). We report
// `prefers-reduced-motion: reduce` as matching, so the landing motion primitives take
// their static / final-state branch in the jsdom unit project — content renders visible
// and query-able without an IntersectionObserver (the real API backs the browser-mode
// story tests + the e2e). ADR 0007/0096.
if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) =>
    ({
      matches: /prefers-reduced-motion/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom implements no IntersectionObserver; Motion's `whileInView` observes with it. A
// no-op stub keeps the jsdom project green even on the (unused, reduced-motion) animated
// path (the real API backs the browser-mode story tests). ADR 0007/0096.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
