# Visitor Info Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in lower-left visitor information floating panel to Komari Nexus that fetches visitor IP metadata from `ipinfo.io`, measures Google latency, uses approved Chinese labels, auto-hides after load, and remains visible with fallback copy when remote requests fail.

**Architecture:** Implement a dedicated client component `VisitorInfoPanel` that owns all fetch, timer, and rendering logic and mount it once in the root layout. Keep the feature self-contained, reuse the existing local flag rendering approach, and verify behavior through component-level Vitest coverage rather than page-level integration tests.

**Tech Stack:** Next.js App Router, React 19 client components, Vitest, Testing Library, Tailwind utility classes, existing `Flag` component

---

## File Structure

### New files

- `src/components/VisitorInfoPanel.tsx`
  - Self-contained visitor panel component
  - Owns fetch lifecycle, latency measurement, timer logic, and fallback rendering
- `src/components/VisitorInfoPanel.test.tsx`
  - Component tests for success path, failure path, auto-hide, and reopen behavior

### Modified files

- `src/app/layout.tsx`
  - Mount `VisitorInfoPanel` once so it appears across the whole theme

### Existing files to reference while implementing

- `src/components/Flag.tsx`
  - Reuse local flag asset behavior instead of runtime CDN flag CSS
- `src/test/setup.ts`
  - Testing environment setup for Testing Library and jsdom
- `package.json`
  - Verification commands: `npm run test` and `npm run build`

---

### Task 1: Lock Down Panel Behavior with Failing Tests

**Files:**
- Create: `src/components/VisitorInfoPanel.test.tsx`
- Reference: `src/components/Flag.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `src/components/VisitorInfoPanel.test.tsx` with the following content:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VisitorInfoPanel from "@/components/VisitorInfoPanel";

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

const originalPerformanceNow = performance.now.bind(performance);

describe("VisitorInfoPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 48;
      return now;
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = undefined as unknown as typeof fetch;
  });

  it("shows visitor info, auto-hides, and reopens from the compact button", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "203.0.113.7",
          city: "Tokyo",
          country: "JP",
          org: "AS12345 Example Telecom",
        }),
      } as Response)
      .mockResolvedValue({ ok: true } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<VisitorInfoPanel />);

    expect(await screen.findByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("IP 地址")).toBeInTheDocument();
    expect(screen.getByText("地理位置")).toBeInTheDocument();
    expect(screen.getByText("运营商")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText(/Example Telecom/)).toBeInTheDocument();
    expect(screen.getByTestId("flag-JP")).toBeInTheDocument();

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(panel).toHaveAttribute("data-state", "closed");
      expect(reopenButton).toHaveAttribute("data-state", "visible");
    });

    await user.click(reopenButton);

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");
  });

  it("keeps the shell visible and shows fallback copy when metadata fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(await screen.findByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("获取失败")).toBeInTheDocument();
    expect(screen.getAllByText("不可用").length).toBeGreaterThan(0);
  });

  it("shows latency fallback when ip info succeeds but latency checks fail", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "198.51.100.9",
          city: "Singapore",
          country: "SG",
          org: "AS64500 Demo Net",
        }),
      } as Response)
      .mockRejectedValue(new Error("latency blocked"));

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(await screen.findByText("198.51.100.9")).toBeInTheDocument();
    expect(screen.getByText("不可用")).toBeInTheDocument();
    expect(screen.getByTestId("flag-SG")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the new test file and verify it fails**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx
```

Expected:

```text
FAIL  src/components/VisitorInfoPanel.test.tsx
Error: Failed to resolve import "@/components/VisitorInfoPanel"
```

- [ ] **Step 3: Commit the failing-test checkpoint**

Run:

```bash
git add src/components/VisitorInfoPanel.test.tsx
git commit -m "test: cover visitor info panel behavior"
```

---

### Task 2: Implement the VisitorInfoPanel Component

**Files:**
- Create: `src/components/VisitorInfoPanel.tsx`
- Reference: `src/components/Flag.tsx`
- Test: `src/components/VisitorInfoPanel.test.tsx`

- [ ] **Step 1: Write the minimal implementation**

Create `src/components/VisitorInfoPanel.tsx` with this structure:

```tsx
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

  return `${Math.max(1, Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length))} ms`;
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
            <div className="break-words font-medium text-foreground">
              {state.organization}
            </div>
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
          open ? "pointer-events-none scale-90 opacity-0" : "pointer-events-auto scale-100 opacity-100",
        ].join(" ")}
      >
        {state.countryCode ? <Flag flag={state.countryCode} size="5" /> : <Activity className="h-4 w-4 text-primary" />}
      </button>
    </>
  );
}
```

- [ ] **Step 2: Run the focused tests and verify they pass**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx
```

Expected:

```text
PASS  src/components/VisitorInfoPanel.test.tsx
3 passed
```

- [ ] **Step 3: Commit the component implementation**

Run:

```bash
git add src/components/VisitorInfoPanel.tsx src/components/VisitorInfoPanel.test.tsx
git commit -m "feat: add visitor info panel"
```

---

### Task 3: Mount the Panel Globally

**Files:**
- Modify: `src/app/layout.tsx`
- Reference: `src/components/VisitorInfoPanel.tsx`

- [ ] **Step 1: Update the root layout to render the panel once**

Change `src/app/layout.tsx` to:

```tsx
import type { Metadata } from "next";
import "@/global.css";
import { Providers } from "@/components/providers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import VisitorInfoPanel from "@/components/VisitorInfoPanel";

export const metadata: Metadata = {
  title: "Komari Monitor",
  description: "A simple server monitor tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col transition-colors duration-300">
        <Providers>
          <NavBar />
          <main className="flex-1 py-4 md:py-12">
            {children}
          </main>
          <Footer />
          <VisitorInfoPanel />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Run a focused smoke test against the existing suite**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx src/components/NodeDisplay.test.tsx src/components/NodeMapView.test.tsx
```

Expected:

```text
PASS  src/components/VisitorInfoPanel.test.tsx
PASS  src/components/NodeDisplay.test.tsx
PASS  src/components/NodeMapView.test.tsx
```

- [ ] **Step 3: Commit the layout integration**

Run:

```bash
git add src/app/layout.tsx
git commit -m "feat: mount visitor info panel globally"
```

---

### Task 4: Full Verification and Packaging Readiness

**Files:**
- Verify: `src/components/VisitorInfoPanel.tsx`
- Verify: `src/components/VisitorInfoPanel.test.tsx`
- Verify: `src/app/layout.tsx`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm run test
```

Expected:

```text
PASS  all test files
```

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
Generating static pages ... done
```

Warnings about `rewrites` with `output: export` may still appear and do not block this feature if the build succeeds.

- [ ] **Step 3: Prepare the final commit**

Run:

```bash
git add src/components/VisitorInfoPanel.tsx src/components/VisitorInfoPanel.test.tsx src/app/layout.tsx
git commit -m "feat: ship built-in visitor info panel"
```

- [ ] **Step 4: Push the branch**

Run:

```bash
git push
```

Expected:

```text
<branch> -> origin/<branch>
```

---

## Self-Review

### Spec coverage

- Global mount across the theme: covered by Task 3
- Lower-left slide-in and auto-hide interaction: covered by Task 2 tests and implementation
- Chinese labels: covered by Task 2 implementation
- `ipinfo.io` metadata fetch: covered by Task 2 implementation
- Google latency measurement: covered by Task 2 implementation
- Failure fallback without hiding the shell: covered by Task 1 tests and Task 2 implementation
- No cache between refreshes: covered by Task 2 implementation using `cache: "no-store"`
- No regression to map, drawer, or existing layout: covered by Task 3 smoke test and Task 4 full verification

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation placeholders remain
- Every code-changing step includes concrete code
- Every verification step includes an exact command and expected outcome

### Type consistency

- Component name is consistently `VisitorInfoPanel`
- State shape is consistently `VisitorInfoState`
- Root mount path is consistently `src/app/layout.tsx`
- Button label is consistently `重新展开访客信息`
