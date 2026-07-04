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
