import { useEffect, useMemo, useRef, useState } from "react";

interface ProgressiveRenderOptions {
  enabled?: boolean;
  initialCount?: number;
  batchSize?: number;
  batchDelayMs?: number;
  revealAllOnInteraction?: boolean;
  resetKey?: string | number;
}

const INITIAL_RESET_KEY = Symbol("initial-progressive-render-reset-key");
const EMPTY_RESET_KEY = Symbol("empty-progressive-render-reset-key");

export function useProgressiveRender<T>(
  items: T[],
  {
    enabled = true,
    initialCount = 10,
    batchSize = 10,
    batchDelayMs = 120,
    revealAllOnInteraction = true,
    resetKey,
  }: ProgressiveRenderOptions = {},
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    enabled ? Math.min(initialCount, items.length) : items.length,
  );
  const previousResetKeyRef = useRef<string | number | symbol>(INITIAL_RESET_KEY);
  const previousLengthRef = useRef(items.length);
  const previousEnabledRef = useRef(enabled);
  const stableResetKey = resetKey ?? EMPTY_RESET_KEY;

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(items.length);
      previousResetKeyRef.current = stableResetKey;
      previousLengthRef.current = items.length;
      previousEnabledRef.current = enabled;
      return;
    }

    const nextInitialCount = Math.min(initialCount, items.length);
    const isFirstRun = previousResetKeyRef.current === INITIAL_RESET_KEY;
    const resetKeyChanged = !isFirstRun && previousResetKeyRef.current !== stableResetKey;
    const wasDisabled = !previousEnabledRef.current;
    const shouldReset = isFirstRun || resetKeyChanged || wasDisabled;

    previousResetKeyRef.current = stableResetKey;
    previousEnabledRef.current = enabled;
    const previousLength = previousLengthRef.current;
    previousLengthRef.current = items.length;

    setVisibleCount((currentVisibleCount) => {
      if (shouldReset) {
        return nextInitialCount;
      }

      const wasComplete = currentVisibleCount >= previousLength;

      if (wasComplete) {
        return items.length;
      }

      return Math.min(currentVisibleCount, items.length);
    });
  }, [enabled, initialCount, items.length, stableResetKey]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || visibleCount >= items.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleCount((currentVisibleCount) =>
        Math.min(currentVisibleCount + batchSize, items.length),
      );
    }, batchDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [batchDelayMs, batchSize, enabled, items.length, visibleCount]);

  useEffect(() => {
    if (
      !enabled ||
      !revealAllOnInteraction ||
      visibleCount >= items.length ||
      typeof window === "undefined"
    ) {
      return;
    }

    const revealAll = () => {
      setVisibleCount(items.length);
    };

    window.addEventListener("wheel", revealAll, { passive: true });
    window.addEventListener("touchmove", revealAll, { passive: true });
    window.addEventListener("scroll", revealAll, { passive: true });

    return () => {
      window.removeEventListener("wheel", revealAll);
      window.removeEventListener("touchmove", revealAll);
      window.removeEventListener("scroll", revealAll);
    };
  }, [enabled, items.length, revealAllOnInteraction, visibleCount]);

  return useMemo(
    () => ({
      visibleItems: items.slice(0, visibleCount),
      visibleCount,
      remainingCount: Math.max(items.length - visibleCount, 0),
      isComplete: visibleCount >= items.length,
    }),
    [items, visibleCount],
  );
}
