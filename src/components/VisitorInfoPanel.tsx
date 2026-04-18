"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Globe, MapPin, Wifi } from "lucide-react";

import Flag from "@/components/Flag";

const AUTO_HIDE_DELAY = 5000;
const INFO_ENDPOINT = "https://ipinfo.io/json";
const LATENCY_ENDPOINT = "https://www.google.com/generate_204";

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
  location: "不可用",
  countryCode: null,
  organization: "不可用",
  latency: "不可用",
  failed: true,
};

const sanitizeCountryCode = (value?: string) =>
  typeof value === "string" && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null;

const buildLocation = (city?: string, country?: string) => {
  const countryCode = sanitizeCountryCode(country);
  const countryName = countryCode
    ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode
    : country ?? "不可用";

  if (city && countryName) {
    return `${city}, ${countryName}`;
  }

  return countryName || city || "不可用";
};

const measureLatency = async () => {
  const samples: number[] = [];

  try {
    await fetch(`${LATENCY_ENDPOINT}?warm=${Date.now()}`, {
      cache: "no-store",
      mode: "no-cors",
    });
  } catch {}

  for (let index = 0; index < 4; index += 1) {
    try {
      const startedAt = performance.now();
      await fetch(`${LATENCY_ENDPOINT}?sample=${index}-${Date.now()}`, {
        cache: "no-store",
        mode: "no-cors",
      });
      samples.push(performance.now() - startedAt);
    } catch {}
  }

  if (samples.length === 0) {
    return "不可用";
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

    const startAutoHide = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setOpen(false);
      }, AUTO_HIDE_DELAY);
    };

    const load = async () => {
      try {
        const response = await fetch(INFO_ENDPOINT, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`ipinfo ${response.status}`);
        }

        const payload = (await response.json()) as VisitorInfoPayload;
        const latency = await measureLatency();

        if (!cancelled) {
          setState({
            ip: payload.ip || "不可用",
            location: buildLocation(payload.city, payload.country),
            countryCode: sanitizeCountryCode(payload.country),
            organization: payload.org || "不可用",
            latency,
            failed: false,
          });
          startAutoHide();
        }
      } catch {
        if (!cancelled) {
          setState(DEFAULT_STATE);
          startAutoHide();
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const latencyTone = useMemo(() => {
    if (state.latency === "不可用") {
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
    }
  };

  const restartAutoHide = () => {
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
          "fixed bottom-6 left-4 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-border/70",
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
          "fixed bottom-6 left-4 z-[71] flex h-11 w-11 items-center justify-center rounded-full border border-border/70",
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
