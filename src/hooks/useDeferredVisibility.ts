import { useEffect, useRef, useState } from "react";

interface DeferredVisibilityOptions {
  idleTimeout?: number;
  rootMargin?: string;
}

type IdleCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function useDeferredVisibility<T extends HTMLElement>({
  idleTimeout = 150,
  rootMargin = "240px",
}: DeferredVisibilityOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady || typeof window === "undefined") {
      return;
    }

    const node = ref.current;
    const idleWindow = window as IdleCapableWindow;
    if (!node) {
      return;
    }

    let idleHandle: number | null = null;
    let observer: IntersectionObserver | null = null;

    const clearIdle = () => {
      if (idleHandle === null) {
        return;
      }

      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle);
      }

      idleHandle = null;
    };

    const markReady = () => {
      clearIdle();
      setIsReady(true);
    };

    const scheduleReady = () => {
      if (idleHandle !== null) {
        return;
      }

      if (typeof idleWindow.requestIdleCallback === "function") {
        idleHandle = idleWindow.requestIdleCallback(markReady, {
          timeout: idleTimeout,
        });
      } else {
        idleHandle = window.setTimeout(markReady, idleTimeout);
      }
    };

    if ("IntersectionObserver" in window) {
      observer = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            observer = null;
            scheduleReady();
          }
        },
        { rootMargin },
      );

      observer.observe(node);
    } else {
      scheduleReady();
    }

    return () => {
      clearIdle();
      observer?.disconnect();
    };
  }, [idleTimeout, isReady, rootMargin]);

  return [ref, isReady] as const;
}
