"use client";

import { create } from "zustand";

/**
 * Ephemeral UI state (ADR 0026). Zustand holds **only** client-only, transient
 * UI state that should live neither in the URL nor in the server cache:
 *
 *   - Belongs here: open/closed disclosure (drawers, menus, dialogs), multi-step
 *     wizard progress, transient interaction state.
 *   - Does NOT belong here:
 *       · server-derived data → TanStack Query (0025);
 *       · shareable/bookmarkable state — search, filters, sort, pagination, tab
 *         → URL via nuqs (0027).
 *     Server data is never mirrored into a store, and optimistic state lives in
 *     the Query cache, not here (0025).
 *
 * This module is `"use client"`, so a Server Component importing it fails the
 * build — the boundary in 0026 enforced at the bundler, not just by review.
 * Read with selectors (`useUIStore((s) => s.mobileNavOpen)`) so a component
 * re-renders only on the slice it uses.
 */
interface UIState {
  /** Whether the mobile navigation drawer is open — a transient UI toggle. */
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () =>
    set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
}));
