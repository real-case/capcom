"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useReducedMotion,
} from "motion/react";

/**
 * Landing motion primitives — the JS-motion "islands" of ADR 0096, scoped to the landing
 * widget. The landing stays a Server Component that renders all its copy into the SSR HTML
 * (ADR 0002); these thin `"use client"` wrappers only *enhance* that already-rendered
 * content. Two invariants are load-bearing:
 *
 *   1. **Usable without JS / motion.** Every wrapper renders its children in the *final,
 *      visible* state during SSR and the first client render, and only switches to the
 *      animated element after mount (`ready`) — so with JS off, or under
 *      `prefers-reduced-motion`, the content is simply there, never hidden behind an
 *      unplayed animation (ADR 0096 / 0039 / 0052).
 *   2. **Deterministic snapshots.** Motion animates via WAAPI/rAF, which the CSS freeze
 *      cannot tame; `useReducedMotion()` (forced in the Chromatic env, `.storybook`) makes
 *      each wrapper take the static branch, so a snapshot renders the final state (ADR 0043).
 *
 * Motion only ever drives `opacity` / `transform`, never a tokenized property, so the token
 * gate (ADR 0058) is untouched.
 */

const emptySubscribe = () => () => {};

/**
 * `true` once the client has hydrated, `false` during SSR and the first client render — the
 * hydration-safe idiom (`useSyncExternalStore` with a server snapshot of `false`), so the
 * static SSR markup matches the first client render exactly and there is no mismatch. Unlike
 * a `useState` + `useEffect` mount flag, it triggers no cascading-render lint (ADR 0003/0006).
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Whether motion should actually play: after hydration AND the user hasn't asked to reduce it. */
function useMotionReady(): boolean {
  const reduce = useReducedMotion();
  return useHydrated() && !reduce;
}

/**
 * App-level motion policy (ADR 0096). Wraps the landing route so `prefers-reduced-motion`
 * is honored globally (`useReducedMotion()` resolves to the user's OS setting). Kept
 * *outside* the widget so Storybook/Chromatic can force `reducedMotion="always"` over the
 * same tree without an inner override fighting it.
 */
export function MotionPolicy({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Loads the DOM animation feature bundle so the `m.*` components below work. `strict`
 * forbids the heavier `motion.*` components, keeping the landing bundle lean (ADR 0096 —
 * `LazyMotion` discipline). Wraps the landing content inside the widget.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

const REVEAL_SPRING = { type: "spring", stiffness: 140, damping: 24 } as const;

/**
 * Scroll/entrance reveal — fades + lifts its children into place the first time they enter
 * the viewport. `delay` staggers siblings (pass `index * step`). Progressive-enhancement per
 * the module contract: static + visible until motion is ready.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Initial vertical offset in px (the slide distance). */
  y?: number;
}) {
  const play = useMotionReady();
  if (!play) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ ...REVEAL_SPRING, delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * Ambient float — a slow, infinite drift for decorative elements (the mesh blobs, the hero
 * product visual). Gated the same way, and because the drift is infinite it is disabled
 * under reduced motion and frozen in Chromatic, so it never destabilizes a snapshot.
 */
export function Floating({
  children,
  className,
  y = 14,
  x = 0,
  duration = 9,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  duration?: number;
}) {
  const play = useMotionReady();
  if (!play) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      animate={{ y: [0, -y, 0], x: [0, x, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </m.div>
  );
}
