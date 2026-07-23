import { cn } from "@/lib/utils";

import { Floating } from "./motion";

/**
 * Decorative aurora mesh (ADR 0096 premium landing). A stack of soft, blurred colour blobs
 * that drift slowly behind the hero — purely presentational, so it is `aria-hidden` and
 * `pointer-events-none`. Every colour is a semantic token (ADR 0081/0058): four data-viz
 * hues, all of which flip with the light/dark theme (ADR 0092), so the mesh re-composes with
 * the rest of the mission-control chrome. The drift is a
 * `Floating` island — disabled under reduced motion and frozen in Chromatic (ADR 0043/0039).
 */
export function MeshBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <Floating
        className="absolute -top-24 -left-24 h-[28rem] w-[28rem]"
        y={22}
        x={12}
        duration={11}
      >
        <div className="h-full w-full rounded-full bg-viz-categorical-1/25 blur-3xl" />
      </Floating>
      <Floating
        className="absolute -top-32 right-[-6rem] h-[26rem] w-[26rem]"
        y={16}
        x={-14}
        duration={13}
      >
        <div className="h-full w-full rounded-full bg-viz-categorical-4/20 blur-3xl" />
      </Floating>
      <Floating
        className="absolute top-40 left-1/3 h-[24rem] w-[24rem]"
        y={26}
        duration={15}
      >
        <div className="h-full w-full rounded-full bg-viz-categorical-6/25 blur-3xl" />
      </Floating>
      <Floating
        className="absolute -bottom-32 right-1/4 h-[22rem] w-[22rem]"
        y={18}
        x={10}
        duration={12}
      >
        <div className="h-full w-full rounded-full bg-viz-categorical-2/20 blur-3xl" />
      </Floating>
      {/* A faint top-down wash that fades the mesh into the page background. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-background" />
    </div>
  );
}
