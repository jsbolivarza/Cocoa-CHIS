/* motion.ts
   Small helpers for the few animations the app uses (see motion.css). Every
   animation has a job: show what just changed while the coach types. None
   delays input, and all of them stop for "reduce motion" users. */

import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const DURATION = 320;

/** A number that glides to its new value (ease-out, ~0.3 s) instead of
 *  jumping, plus a counter that goes up on every change so the caller can
 *  restart a highlight (use it as a React key). Non-numbers pass through. */
export function useTweenedNumber(value: unknown): { shown: unknown; pulse: number } {
  const target = typeof value === "number" && isFinite(value) ? value : null;
  const [shown, setShown] = useState<number | null>(target);
  const [pulse, setPulse] = useState(0);
  const previous = useRef<number | null>(target);

  useEffect(() => {
    const from = previous.current;
    if (target === from) return;
    previous.current = target;
    if (target == null || from == null || prefersReducedMotion()) {
      setShown(target);
      return;
    }
    setPulse((p) => p + 1);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(from + (target - from) * eased);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return { shown: target == null ? value : shown, pulse };
}
