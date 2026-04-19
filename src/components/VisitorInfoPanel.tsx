"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Globe, MapPin } from "lucide-react";

import Flag from "@/components/Flag";

const AUTO_HIDE_DELAY = 5000;
const INTRO_DELAY = 32;
const LATENCY_TIMEOUT = 4000;
const CONSENT_KEY = "visitorInfoConsentV1";
const INFO_ENDPOINT = "https://ipinfo.io/json";
const LATENCY_ENDPOINT = "https://www.cloudflare.com/cdn-cgi/trace";
const UNAVAILABLE = "不可用";
const PANEL_TITLE = "访客信息";
const LATENCY_LABEL = "延迟";
const IP_LABEL = "IP 地址";
const LOCATION_LABEL = "地理位置";
const REOPEN_LABEL = "重新展开访客信息";
const CONSENT_DESCRIPTION =
  "启用后会向 ipinfo.io 和 Cloudflare 发起网络请求，用于获取 IP、地理位置和延迟信息。";
const CONSENT_ACCEPT_LABEL = "继续查询";
const CONSENT_CANCEL_LABEL = "暂不启用";

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

const hasLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getStoredConsent = () =>
  hasLocalStorage() && window.localStorage.getItem(CONSENT_KEY) === "true";

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

const measureLatencyWithTimeout = async (signal: AbortSignal) =>
  new Promise<string>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(UNAVAILABLE);
    }, LATENCY_TIMEOUT);

    void measureLatency(signal)
      .then((latency) => resolve(latency))
      .catch(() => resolve(UNAVAILABLE))
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  });

export default function VisitorInfoPanel() {
  const [hasConsent, setHasConsent] = useState(getStoredConsent);
  const [showConsent, setShowConsent] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VisitorInfoState | null>(null);
  const [hasPresented, setHasPresented] = useState(false);
  const timerRef = useRef<number | null>(null);
  const introTimerRef = useRef<number | null>(null);

  const clearAutoHide = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearIntroTimer = () => {
    if (introTimerRef.current) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  };

  const startAutoHide = () => {
    clearAutoHide();
    timerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, AUTO_HIDE_DELAY);
  };

  useEffect(() => {
    if (!hasConsent) {
      clearAutoHide();
      clearIntroTimer();
      setOpen(false);
      setHasPresented(false);
      setState(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

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
        const latency = await measureLatencyWithTimeout(controller.signal);

        if (cancelled || controller.signal.aborted) {
          return;
        }

        setState({
          ip: payload.ip || UNAVAILABLE,
          location: buildLocation(payload.city, payload.country),
          countryCode: sanitizeCountryCode(payload.country),
          organization: payload.org || UNAVAILABLE,
          latency,
        });
        setHasPresented(false);
        setOpen(false);
        clearIntroTimer();
        introTimerRef.current = window.setTimeout(() => {
          if (cancelled || controller.signal.aborted) {
            return;
          }

          setHasPresented(true);
          setOpen(true);
          startAutoHide();
        }, INTRO_DELAY);
      } catch {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        clearAutoHide();
        clearIntroTimer();
        setOpen(false);
        setHasPresented(false);
        setState(null);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
      clearAutoHide();
      clearIntroTimer();
    };
  }, [hasConsent]);

  const latencyTone = useMemo(() => {
    if (!state || state.latency === UNAVAILABLE) {
      return "bg-muted text-muted-foreground";
    }

    const numericValue = Number.parseInt(state.latency, 10);
    return numericValue > 200
      ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }, [state]);

  const pauseAutoHide = () => {
    clearAutoHide();
  };

  const restartAutoHide = () => {
    if (!state) {
      return;
    }

    startAutoHide();
  };

  const reopen = () => {
    if (!state) {
      return;
    }

    setHasPresented(true);
    setOpen(true);
    startAutoHide();
  };

  const acceptConsent = () => {
    if (hasLocalStorage()) {
      window.localStorage.setItem(CONSENT_KEY, "true");
    }

    setShowConsent(false);
    setHasConsent(true);
  };

  if (!hasConsent && !state) {
    return (
      <>
        {showConsent && (
          <aside
            data-testid="visitor-info-consent"
            className="fixed bottom-20 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="space-y-4 p-4 sm:p-5">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">{PANEL_TITLE}</div>
                <p className="text-sm leading-6 text-muted-foreground">{CONSENT_DESCRIPTION}</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  data-testid="visitor-info-consent-cancel"
                  onClick={() => setShowConsent(false)}
                  className="rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  {CONSENT_CANCEL_LABEL}
                </button>
                <button
                  type="button"
                  data-testid="visitor-info-consent-accept"
                  onClick={acceptConsent}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {CONSENT_ACCEPT_LABEL}
                </button>
              </div>
            </div>
          </aside>
        )}

        <button
          type="button"
          aria-label={REOPEN_LABEL}
          data-testid="visitor-info-toggle"
          data-state="visible"
          onClick={() => setShowConsent((current) => !current)}
          className="fixed bottom-6 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300 pointer-events-auto scale-100 opacity-100"
        >
          <Activity className="h-4 w-4 text-primary" />
        </button>
      </>
    );
  }

  if (!state) {
    return null;
  }

  return (
    <>
      <aside
        data-testid="visitor-info-panel"
        data-state={open ? "open" : "closed"}
        onMouseEnter={pauseAutoHide}
        onMouseLeave={restartAutoHide}
        className={[
          "fixed bottom-6 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-border/70",
          "bg-background/90 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out will-change-transform",
          open
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-[120%] scale-95 opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              {state.countryCode ? (
                <Flag flag={state.countryCode} size="5" />
              ) : (
                <Activity className="h-4 w-4 text-primary" />
              )}
              <span>{PANEL_TITLE}</span>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latencyTone}`}>
              {LATENCY_LABEL} {state.latency}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{IP_LABEL}</span>
              </div>
              <span className="font-mono text-right text-sm text-foreground">{state.ip}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 pt-0.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{LOCATION_LABEL}</span>
              </div>
              <div className="max-w-[13.5rem] text-right text-foreground">
                <span className="line-clamp-2 break-words">{state.location}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-100/85 px-4 py-3 text-center text-sm text-slate-700">
            <div className="break-words font-medium text-foreground">{state.organization}</div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        aria-label={REOPEN_LABEL}
        data-testid="visitor-info-toggle"
        data-state={!hasPresented || open ? "hidden" : "visible"}
        onClick={reopen}
        className={[
          "fixed bottom-6 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/70",
          "bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300",
          !hasPresented || open
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
