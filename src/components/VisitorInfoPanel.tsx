"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Globe, MapPin, Wifi } from "lucide-react";

import Flag from "@/components/Flag";

const AUTO_HIDE_DELAY = 5000;
const INFO_ENDPOINT = "https://ipinfo.io/json";
const LATENCY_ENDPOINT = "https://www.google.com/generate_204";
const UNAVAILABLE = "不可用";

type VisitorInfoPayload = {
  ip?: string;
  city?: string;
  country?: string;
  org?: string;
};

type VisitorInfoState = {
  ip: string;
  location: string;
  countryCode: string | null;
  organization: string;
  latency: string;
  failed: boolean;
};

const DEFAULT_STATE: VisitorInfoState = {
  ip: "获取失败",
  location: UNAVAILABLE,
  countryCode: null,
  organization: UNAVAILABLE,
  latency: UNAVAILABLE,
  failed: true,
};

const sanitizeCountryCode = (value?: string) =>
  typeof value === "string" && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null;

const buildLocation = (city?: string, country?: string) => {
  const countryCode = sanitizeCountryCode(country);
  const countryName = countryCode
    ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode
    : country ?? UNAVAILABLE;

  if (city && countryName) {
    return `${city}, ${countryName}`;
  }

  return countryName || city || UNAVAILABLE;
};

const measureLatency = async (signal: AbortSignal) => {
  const samples: number[] = [];

  try {
    await fetch(`${LATENCY_ENDPOINT}?warm=${Date.now()}`, {
      cache: "no-store",
      mode: "no-cors",
      signal,
    });
  } catch {}

  for (let index = 0; index < 4; index += 1) {
    try {
      const startedAt = performance.now();
      await fetch(`${LATENCY_ENDPOINT}?sample=${index}-${Date.now()}`, {
        cache: "no-store",
        mode: "no-cors",
        signal,
      });
      samples.push(performance.now() - startedAt);
    } catch {}
  }

  if (samples.length === 0) {
    return UNAVAILABLE;
  }

  if (samples.length > 1) {
    samples.sort((left, right) => left - right);
    samples.pop();
  }

  return `${Math.max(
    1,
    Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length),
  )} ms`;
};

export default function VisitorInfoPanel() {
  const [open, setOpen] = useState(true);
  const [state, setState] = useState<VisitorInfoState>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const clearAutoHide = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const startAutoHide = () => {
      clearAutoHide();
      timerRef.current = window.setTimeout(() => {
        setOpen(false);
      }, AUTO_HIDE_DELAY);
    };

    const load = async () => {
      try {
        const response = await fetch(INFO_ENDPOINT, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`ipinfo ${response.status}`);
        }

        const payload = (await response.json()) as VisitorInfoPayload;

        if (cancelled) {
          return;
        }

        setState({
          ip: payload.ip || UNAVAILABLE,
          location: buildLocation(payload.city, payload.country),
          countryCode: sanitizeCountryCode(payload.country),
          organization: payload.org || UNAVAILABLE,
          latency: UNAVAILABLE,
          failed: false,
        });
        startAutoHide();

        void measureLatency(controller.signal).then((latency) => {
          if (cancelled) {
            return;
          }

          setState((current) => {
            if (current.failed) {
              return current;
            }

            return {
              ...current,
              latency,
            };
          });
        });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        if (!cancelled) {
          clearAutoHide();
          setOpen(true);
          setState(DEFAULT_STATE);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      clearAutoHide();
    };
  }, []);

  const latencyTone = useMemo(() => {
    if (state.latency === UNAVAILABLE) {
      return "bg-muted text-muted-foreground";
    }

    const numericValue = Number.parseInt(state.latency, 10);
    return numericValue > 200
      ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }, [state.latency]);

  const pauseAutoHide = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const restartAutoHide = () => {
    if (state.failed) {
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, AUTO_HIDE_DELAY);
  };

  const reopen = () => {
    setOpen(true);
    restartAutoHide();
  };

  return (
    <>
      <aside
        data-testid="visitor-info-panel"
        data-state={open ? "open" : "closed"}
        onMouseEnter={pauseAutoHide}
        onMouseLeave={restartAutoHide}
        className={[
          "fixed bottom-6 left-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-border/70",
          "bg-background/90 shadow-2xl backdrop-blur-xl transition-transform duration-500",
          open ? "translate-x-0" : "-translate-x-[120%]",
        ].join(" ")}
      >
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              <span>访客信息</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latencyTone}`}>
              延迟 {state.latency}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>IP 地址</span>
              </div>
              <span className="font-mono text-right text-foreground">{state.ip}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>地理位置</span>
              </div>
              <div className="flex max-w-[12rem] items-center gap-2 text-right text-foreground">
                {state.countryCode ? <Flag flag={state.countryCode} size="5" /> : null}
                <span className="truncate">{state.location}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Wifi className="h-4 w-4" />
              <span>运营商</span>
            </div>
            <div className="break-words font-medium text-foreground">{state.organization}</div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        aria-label="重新展开访客信息"
        data-state={open ? "hidden" : "visible"}
        onClick={reopen}
        className={[
          "fixed bottom-6 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70",
          "bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300",
          open
            ? "pointer-events-none scale-90 opacity-0"
            : "pointer-events-auto scale-100 opacity-100",
        ].join(" ")}
      >
        {state.countryCode ? (
          <Flag flag={state.countryCode} size="5" />
        ) : (
          <Activity className="h-4 w-4 text-primary" />
        )}
      </button>
    </>
  );
}
