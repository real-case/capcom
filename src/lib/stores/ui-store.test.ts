import { beforeEach, describe, expect, it } from "vitest";

import { useUIStore } from "./ui-store";

// Zustand stores are testable without React: drive actions through getState()
// and read the resulting slice. Reset to the initial state before each test so
// cases don't bleed into each other.
beforeEach(() => {
  useUIStore.setState({ mobileNavOpen: false });
});

describe("useUIStore", () => {
  it("starts with the mobile nav closed", () => {
    expect(useUIStore.getState().mobileNavOpen).toBe(false);
  });

  it("opens and closes the mobile nav", () => {
    useUIStore.getState().openMobileNav();
    expect(useUIStore.getState().mobileNavOpen).toBe(true);

    useUIStore.getState().closeMobileNav();
    expect(useUIStore.getState().mobileNavOpen).toBe(false);
  });

  it("toggles the mobile nav from its current value", () => {
    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().mobileNavOpen).toBe(true);

    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().mobileNavOpen).toBe(false);
  });
});
