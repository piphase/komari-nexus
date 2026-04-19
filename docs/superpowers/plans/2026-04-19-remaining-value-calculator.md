# Remaining Value Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global lower-right floating remaining-value calculator that computes per-node residual value from existing billing data, converts totals into a selected display currency, and shows active, skipped, and expired sections without changing the backend.

**Architecture:** Implement the feature in three focused layers: a pure remaining-value helper for billing rules, a pure exchange-rate helper for browser fetch plus local cache, and a global React floating panel that consumes the existing node list context. Mount the panel in the root layout next to the existing visitor panel, use a fixed desktop panel plus mobile drawer treatment, and keep all business logic covered by Vitest before wiring the UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, `react-i18next`, local `useLocalStorage`, Frankfurter public API (`https://api.frankfurter.dev/v2/rates`)

---

## File Structure

### New files

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\remainingValue.ts`
  Responsible for currency-symbol normalization, billing-cycle classification, remaining-value calculation, active/expired/skipped grouping, and sorted summary output.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\remainingValue.test.ts`
  Pure logic tests for periodic nodes, one-time nodes, expired nodes, skipped nodes, and symbol-to-ISO mapping.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\exchangeRates.ts`
  Responsible for fetching Frankfurter rates, parsing the v2 response, normalizing rate maps, reading and writing `localStorage` cache, and converting amounts between currencies.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\exchangeRates.test.ts`
  Pure logic tests for cache freshness, cache fallback, missing-rate handling, and cross-currency conversion.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\RemainingValueCalculator.tsx`
  Global floating calculator UI. Owns open state, selected display currency, fetch-on-open behavior, refresh action, rendering of summary and detail sections, and mobile/desktop presentation.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\RemainingValueCalculator.test.tsx`
  Component tests for default-closed state, open behavior, summary rendering, currency conversion, expired grouping, and cache-backed failure fallback.

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\app\layout.test.tsx`
  Small integration test to verify the calculator button is mounted globally by the root layout.

### Modified files

- `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\app\layout.tsx`
  Mount the new calculator globally beside `VisitorInfoPanel`.

## Implementation Notes Locked In Before Coding

- The existing `currency` field stores display symbols such as `¥`, `$`, and `€`, not guaranteed ISO codes. The helper must normalize supported symbols into ISO codes before any rate lookup.
- Skip rules stay strict:
  - `price <= 0` skips the node
  - empty `currency` skips the node
  - periodic nodes without a valid `expired_at` skip the node
- One-time nodes keep `remainingValueOriginal = price`.
- Periodic expired nodes move to the expired section and do not contribute to active totals.
- Exchange rates are fetched only when the panel opens or when the user presses refresh.
- Rate cache lifetime is one hour.
- Use Chinese `defaultValue` strings in component code instead of expanding all locale JSON files in this first pass.

### Task 1: Remaining Value Domain Helper

**Files:**
- Create: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\remainingValue.ts`
- Test: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\remainingValue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import {
  buildRemainingValueSnapshot,
  normalizeCurrencyCode,
} from "@/lib/remainingValue";

const baseNode: NodeBasicInfo = {
  uuid: "node-base",
  name: "Base Node",
  cpu_name: "",
  virtualization: "",
  arch: "x86_64",
  cpu_cores: 2,
  os: "Debian",
  kernel_version: "",
  gpu_name: "",
  region: "US",
  mem_total: 0,
  swap_total: 0,
  disk_total: 0,
  version: "",
  weight: 0,
  price: 0,
  tags: "",
  billing_cycle: 0,
  currency: "",
  group: "",
  traffic_limit: 0,
  traffic_limit_type: "sum",
  expired_at: "",
  created_at: "",
  updated_at: "",
  ipv4: "",
  ipv6: "",
};

const at = (patch: Partial<NodeBasicInfo>): NodeBasicInfo => ({
  ...baseNode,
  ...patch,
});

describe("remainingValue domain helper", () => {
  it("normalizes known currency symbols and ISO codes", () => {
    expect(normalizeCurrencyCode("¥")).toBe("CNY");
    expect(normalizeCurrencyCode("$")).toBe("USD");
    expect(normalizeCurrencyCode("eur")).toBe("EUR");
    expect(normalizeCurrencyCode("")).toBeNull();
    expect(normalizeCurrencyCode("???")).toBeNull();
  });

  it("groups periodic, one-time, expired, and skipped nodes correctly", () => {
    const now = new Date("2026-04-19T12:00:00.000Z");

    const snapshot = buildRemainingValueSnapshot(
      [
        at({
          uuid: "periodic-active",
          name: "US VPS",
          price: 10,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2026-05-04T12:00:00.000Z",
        }),
        at({
          uuid: "one-time",
          name: "Storage Box",
          price: 88,
          billing_cycle: -1,
          currency: "¥",
        }),
        at({
          uuid: "expired-node",
          name: "Expired VM",
          price: 15,
          billing_cycle: 30,
          currency: "€",
          expired_at: "2026-04-10T12:00:00.000Z",
        }),
        at({
          uuid: "skipped-node",
          name: "Free Trial",
          price: 0,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2026-05-10T12:00:00.000Z",
        }),
      ],
      now,
    );

    expect(snapshot.active).toHaveLength(2);
    expect(snapshot.expired).toHaveLength(1);
    expect(snapshot.skipped).toHaveLength(1);

    const periodicNode = snapshot.active.find((item) => item.uuid === "periodic-active");
    expect(periodicNode?.currencyCode).toBe("USD");
    expect(periodicNode?.remainingRatio).toBeCloseTo(0.5, 5);
    expect(periodicNode?.remainingValueOriginal).toBeCloseTo(5, 5);

    const oneTimeNode = snapshot.active.find((item) => item.uuid === "one-time");
    expect(oneTimeNode?.remainingValueOriginal).toBe(88);
    expect(oneTimeNode?.remainingMs).toBeNull();

    expect(snapshot.expired[0]).toMatchObject({
      uuid: "expired-node",
      remainingValueOriginal: 0,
      currencyCode: "EUR",
    });

    expect(snapshot.skipped[0]).toMatchObject({
      uuid: "skipped-node",
      skipReason: "missing_price",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/remainingValue.test.ts`

Expected: FAIL with `Cannot find module '@/lib/remainingValue'` or missing exported members.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { NodeBasicInfo } from "@/contexts/NodeListContext";

export type SkipReason =
  | "missing_price"
  | "missing_currency"
  | "unsupported_currency"
  | "missing_expired_at"
  | "invalid_expired_at"
  | "unsupported_billing_cycle";

export type RemainingValueNode = {
  uuid: string;
  name: string;
  price: number;
  billingCycle: number;
  currencySymbol: string;
  currencyCode: string;
  expiresAt: string | null;
  remainingMs: number | null;
  remainingRatio: number;
  remainingValueOriginal: number;
  status: "active" | "expired";
};

export type SkippedRemainingValueNode = {
  uuid: string;
  name: string;
  skipReason: SkipReason;
};

export type RemainingValueSnapshot = {
  active: RemainingValueNode[];
  expired: RemainingValueNode[];
  skipped: SkippedRemainingValueNode[];
};

const SYMBOL_TO_ISO: Record<string, string> = {
  "¥": "CNY",
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "₽": "RUB",
  "₣": "CHF",
  "₹": "INR",
  "₫": "VND",
  "฿": "THB",
};

export function normalizeCurrencyCode(currency: string): string | null {
  const trimmed = currency.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  return SYMBOL_TO_ISO[trimmed] ?? null;
}

function toTimedNode(
  node: NodeBasicInfo,
  nowMs: number,
): RemainingValueNode | SkippedRemainingValueNode {
  if (!Number.isFinite(node.price) || node.price <= 0) {
    return { uuid: node.uuid, name: node.name, skipReason: "missing_price" };
  }

  if (!node.currency.trim()) {
    return { uuid: node.uuid, name: node.name, skipReason: "missing_currency" };
  }

  const currencyCode = normalizeCurrencyCode(node.currency);
  if (!currencyCode) {
    return { uuid: node.uuid, name: node.name, skipReason: "unsupported_currency" };
  }

  if (node.billing_cycle === -1) {
    return {
      uuid: node.uuid,
      name: node.name,
      price: node.price,
      billingCycle: node.billing_cycle,
      currencySymbol: node.currency,
      currencyCode,
      expiresAt: null,
      remainingMs: null,
      remainingRatio: 1,
      remainingValueOriginal: node.price,
      status: "active",
    };
  }

  if (node.billing_cycle <= 0) {
    return { uuid: node.uuid, name: node.name, skipReason: "unsupported_billing_cycle" };
  }

  if (!node.expired_at.trim()) {
    return { uuid: node.uuid, name: node.name, skipReason: "missing_expired_at" };
  }

  const expiresAtMs = new Date(node.expired_at).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return { uuid: node.uuid, name: node.name, skipReason: "invalid_expired_at" };
  }

  const cycleMs = node.billing_cycle * 24 * 60 * 60 * 1000;
  const remainingMs = expiresAtMs - nowMs;

  if (remainingMs <= 0) {
    return {
      uuid: node.uuid,
      name: node.name,
      price: node.price,
      billingCycle: node.billing_cycle,
      currencySymbol: node.currency,
      currencyCode,
      expiresAt: node.expired_at,
      remainingMs: 0,
      remainingRatio: 0,
      remainingValueOriginal: 0,
      status: "expired",
    };
  }

  const remainingRatio = Math.max(0, Math.min(remainingMs / cycleMs, 1));

  return {
    uuid: node.uuid,
    name: node.name,
    price: node.price,
    billingCycle: node.billing_cycle,
    currencySymbol: node.currency,
    currencyCode,
    expiresAt: node.expired_at,
    remainingMs,
    remainingRatio,
    remainingValueOriginal: node.price * remainingRatio,
    status: "active",
  };
}

export function buildRemainingValueSnapshot(
  nodes: NodeBasicInfo[],
  now: Date = new Date(),
): RemainingValueSnapshot {
  const active: RemainingValueNode[] = [];
  const expired: RemainingValueNode[] = [];
  const skipped: SkippedRemainingValueNode[] = [];

  for (const node of nodes) {
    const result = toTimedNode(node, now.getTime());
    if ("skipReason" in result) {
      skipped.push(result);
      continue;
    }

    if (result.status === "expired") {
      expired.push(result);
      continue;
    }

    active.push(result);
  }

  return { active, expired, skipped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/remainingValue.test.ts`

Expected: PASS with 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/remainingValue.ts src/lib/remainingValue.test.ts
git commit -m "feat: add remaining value calculation helper"
```

### Task 2: Exchange Rate Fetch, Cache, and Conversion Helper

**Files:**
- Create: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\exchangeRates.ts`
- Test: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\lib\exchangeRates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  convertAmount,
  loadRates,
  writeRatesCache,
} from "@/lib/exchangeRates";

describe("exchangeRates helper", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("converts through a shared base map", () => {
    const rates = { EUR: 1, USD: 1.25, CNY: 8 };
    expect(convertAmount(10, "USD", "CNY", rates)).toBeCloseTo(64, 5);
    expect(convertAmount(64, "CNY", "USD", rates)).toBeCloseTo(10, 5);
    expect(convertAmount(10, "USD", "USD", rates)).toBe(10);
    expect(convertAmount(10, "USD", "GBP", rates)).toBeNull();
  });

  it("uses fresh cache without calling fetch", async () => {
    writeRatesCache({
      fetchedAt: "2026-04-19T12:00:00.000Z",
      base: "EUR",
      rates: { EUR: 1, USD: 1.25, CNY: 8 },
      provider: "frankfurter",
    });

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await loadRates({
      displayCurrency: "CNY",
      sourceCurrencies: ["USD", "CNY"],
      now: new Date("2026-04-19T12:30:00.000Z"),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe("cache");
    expect(result.rates.CNY).toBe(8);
  });

  it("falls back to stale cache when fetch fails", async () => {
    writeRatesCache({
      fetchedAt: "2026-04-19T08:00:00.000Z",
      base: "EUR",
      rates: { EUR: 1, USD: 1.2, CNY: 7.8 },
      provider: "frankfurter",
    });

    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await loadRates({
      displayCurrency: "CNY",
      sourceCurrencies: ["USD", "CNY"],
      now: new Date("2026-04-19T12:30:00.000Z"),
    });

    expect(result.source).toBe("stale-cache");
    expect(result.rates.USD).toBe(1.2);
    expect(result.isStale).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/exchangeRates.test.ts`

Expected: FAIL with `Cannot find module '@/lib/exchangeRates'`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type RateMap = Record<string, number>;

export type CachedRates = {
  fetchedAt: string;
  base: string;
  rates: RateMap;
  provider: "frankfurter";
};

export type LoadedRates = {
  rates: RateMap;
  fetchedAt: string;
  source: "network" | "cache" | "stale-cache";
  isStale: boolean;
};

type LoadRatesOptions = {
  displayCurrency: string;
  sourceCurrencies: string[];
  now?: Date;
  forceRefresh?: boolean;
};

type FrankfurterRateRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const CACHE_KEY = "remainingValueRatesCacheV1";
const CACHE_TTL_MS = 60 * 60 * 1000;
const API_BASE = "https://api.frankfurter.dev/v2/rates";

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: RateMap,
): number | null {
  if (from === to) {
    return amount;
  }

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    return null;
  }

  return (amount / fromRate) * toRate;
}

function getCachedRates(now: Date = new Date()): (CachedRates & { isFresh: boolean }) | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedRates;
    const age = now.getTime() - new Date(parsed.fetchedAt).getTime();
    return {
      ...parsed,
      isFresh: age >= 0 && age < CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

export function writeRatesCache(cache: CachedRates) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function buildQuotes(displayCurrency: string, sourceCurrencies: string[]) {
  return Array.from(new Set(["EUR", displayCurrency, ...sourceCurrencies])).sort();
}

async function fetchRates(quotes: string[]): Promise<CachedRates> {
  const url = new URL(API_BASE);
  url.searchParams.set("base", "EUR");
  url.searchParams.set("quotes", quotes.join(","));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`exchange rates ${response.status}`);
  }

  const rows = (await response.json()) as FrankfurterRateRow[];
  const rates: RateMap = { EUR: 1 };

  for (const row of rows) {
    rates[row.quote] = row.rate;
  }

  return {
    fetchedAt: new Date().toISOString(),
    base: "EUR",
    rates,
    provider: "frankfurter",
  };
}

export async function loadRates({
  displayCurrency,
  sourceCurrencies,
  now = new Date(),
  forceRefresh = false,
}: LoadRatesOptions): Promise<LoadedRates> {
  const cached = getCachedRates(now);
  const quotes = buildQuotes(displayCurrency, sourceCurrencies);

  if (!forceRefresh && cached?.isFresh && quotes.every((code) => cached.rates[code])) {
    return {
      rates: cached.rates,
      fetchedAt: cached.fetchedAt,
      source: "cache",
      isStale: false,
    };
  }

  try {
    const fresh = await fetchRates(quotes);
    writeRatesCache(fresh);
    return {
      rates: fresh.rates,
      fetchedAt: fresh.fetchedAt,
      source: "network",
      isStale: false,
    };
  } catch (error) {
    if (cached?.rates) {
      return {
        rates: cached.rates,
        fetchedAt: cached.fetchedAt,
        source: "stale-cache",
        isStale: true,
      };
    }

    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/exchangeRates.test.ts`

Expected: PASS with 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exchangeRates.ts src/lib/exchangeRates.test.ts
git commit -m "feat: add exchange rate helper for remaining value"
```

### Task 3: Floating Calculator Component and UI Tests

**Files:**
- Create: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\RemainingValueCalculator.tsx`
- Test: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\RemainingValueCalculator.test.tsx`
- Read for reference: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\VisitorInfoPanel.tsx`
- Read for reference: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\ui\drawer.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RemainingValueCalculator from "@/components/RemainingValueCalculator";

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translate = (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === "string" ? options.defaultValue : key;

    return Object.assign([translate], { t: translate });
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/contexts/NodeListContext", () => ({
  useNodeList: () => ({
    nodeList: [
      {
        uuid: "usd-monthly",
        name: "US VPS",
        cpu_name: "",
        virtualization: "",
        arch: "x86_64",
        cpu_cores: 2,
        os: "Debian",
        kernel_version: "",
        gpu_name: "",
        region: "US",
        mem_total: 0,
        swap_total: 0,
        disk_total: 0,
        version: "",
        weight: 0,
        price: 10,
        tags: "",
        billing_cycle: 30,
        currency: "$",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "2026-05-04T12:00:00.000Z",
        created_at: "",
        updated_at: "",
        ipv4: "",
        ipv6: "",
      },
      {
        uuid: "cny-once",
        name: "Storage Box",
        cpu_name: "",
        virtualization: "",
        arch: "x86_64",
        cpu_cores: 2,
        os: "Debian",
        kernel_version: "",
        gpu_name: "",
        region: "CN",
        mem_total: 0,
        swap_total: 0,
        disk_total: 0,
        version: "",
        weight: 0,
        price: 88,
        tags: "",
        billing_cycle: -1,
        currency: "¥",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "",
        created_at: "",
        updated_at: "",
        ipv4: "",
        ipv6: "",
      },
      {
        uuid: "expired-eur",
        name: "Expired VM",
        cpu_name: "",
        virtualization: "",
        arch: "x86_64",
        cpu_cores: 2,
        os: "Debian",
        kernel_version: "",
        gpu_name: "",
        region: "DE",
        mem_total: 0,
        swap_total: 0,
        disk_total: 0,
        version: "",
        weight: 0,
        price: 20,
        tags: "",
        billing_cycle: 30,
        currency: "€",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "2026-04-10T12:00:00.000Z",
        created_at: "",
        updated_at: "",
        ipv4: "",
        ipv6: "",
      },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe("RemainingValueCalculator", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("stays closed by default and opens from the floating button", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { base: "EUR", quote: "USD", rate: 1.25, date: "2026-04-19" },
        { base: "EUR", quote: "CNY", rate: 8, date: "2026-04-19" },
      ],
    } as Response) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    expect(screen.queryByTestId("remaining-value-panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));

    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();
    expect(screen.getByText("全局剩余价值")).toBeInTheDocument();
    expect(screen.getByText("US VPS")).toBeInTheDocument();
    expect(screen.getByText("Storage Box")).toBeInTheDocument();
    expect(screen.getByText("Expired VM")).toBeInTheDocument();
  });

  it("falls back to cached rates when the refresh request fails", async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      "remainingValueRatesCacheV1",
      JSON.stringify({
        fetchedAt: "2026-04-19T12:00:00.000Z",
        base: "EUR",
        rates: { EUR: 1, USD: 1.25, CNY: 8 },
        provider: "frankfurter",
      }),
    );

    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));

    await waitFor(() => {
      expect(screen.getByText("汇率非最新")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RemainingValueCalculator.test.tsx`

Expected: FAIL with `Cannot find module '@/components/RemainingValueCalculator'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";

import { Calculator, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNodeList } from "@/contexts/NodeListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { buildRemainingValueSnapshot } from "@/lib/remainingValue";
import { convertAmount, loadRates, type LoadedRates } from "@/lib/exchangeRates";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

const DISPLAY_CURRENCIES = ["CNY", "USD", "EUR"] as const;

function formatAmount(code: string, value: number | null) {
  if (value === null) {
    return "暂未换算";
  }

  return `${code} ${value.toFixed(2)}`;
}

function formatRemainingTime(remainingMs: number | null) {
  if (remainingMs === null) {
    return "一次性";
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days} 天 ${hours} 小时`;
}

export default function RemainingValueCalculator() {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useLocalStorage<(typeof DISPLAY_CURRENCIES)[number]>(
    "remainingValueDisplayCurrency",
    "CNY",
  );
  const [ratesState, setRatesState] = useState<LoadedRates | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const snapshot = useMemo(
    () => buildRemainingValueSnapshot(nodeList ?? []),
    [nodeList],
  );

  const convertedActive = useMemo(() => {
    return snapshot.active
      .map((item) => {
        const converted = ratesState
          ? convertAmount(item.remainingValueOriginal, item.currencyCode, displayCurrency, ratesState.rates)
          : null;

        return {
          ...item,
          convertedRemainingValue: converted,
        };
      })
      .sort((left, right) => (right.convertedRemainingValue ?? -1) - (left.convertedRemainingValue ?? -1));
  }, [displayCurrency, ratesState, snapshot.active]);

  const totalConverted = convertedActive.reduce((sum, item) => sum + (item.convertedRemainingValue ?? 0), 0);

  const refreshRates = async (forceRefresh = false) => {
    const sourceCurrencies = Array.from(new Set(snapshot.active.map((item) => item.currencyCode)));
    if (sourceCurrencies.length === 0) {
      return;
    }

    setIsRefreshing(true);
    setRatesError(null);

    try {
      const loaded = await loadRates({
        displayCurrency,
        sourceCurrencies,
        forceRefresh,
      });
      setRatesState(loaded);
    } catch {
      setRatesError("暂时无法获取汇率");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !ratesState && snapshot.active.length > 0) {
      await refreshRates(false);
    }
  };

  const panelBody = (
    <div
      data-testid="remaining-value-panel"
      className="flex max-h-[min(80vh,42rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div>
          <div className="text-sm font-semibold">
            {t("remainingValue.title", { defaultValue: "剩余价值计算器" })}
          </div>
          <div className="text-xs text-muted-foreground">
            {ratesState?.isStale
              ? "汇率非最新"
              : ratesState?.fetchedAt
                ? `汇率更新时间 ${new Date(ratesState.fetchedAt).toLocaleString("zh-CN")}`
                : "等待获取汇率"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {DISPLAY_CURRENCIES.map((currency) => (
            <Button
              key={currency}
              variant={displayCurrency === currency ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDisplayCurrency(currency)}
            >
              {currency}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refreshRates(true)}
            aria-label="刷新汇率"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto p-4">
        <section className="rounded-2xl bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">
            {t("remainingValue.total", { defaultValue: "全局剩余价值" })}
          </div>
          <div className="mt-2 text-2xl font-bold">{formatAmount(displayCurrency, totalConverted)}</div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>参与计算 {snapshot.active.length}</div>
            <div>已跳过 {snapshot.skipped.length}</div>
            <div>已过期 {snapshot.expired.length}</div>
          </div>
          {ratesError && <div className="mt-2 text-sm text-orange-600">{ratesError}</div>}
        </section>

        <section className="space-y-2">
          {convertedActive.map((item) => (
            <article key={item.uuid} className="rounded-2xl border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm font-semibold">
                  {formatAmount(displayCurrency, item.convertedRemainingValue)}
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                原价 {item.currencySymbol}{item.price} / {item.billingCycle === -1 ? "一次性" : `${item.billingCycle} 天`}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                剩余时间 {formatRemainingTime(item.remainingMs)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                原币种价值 {item.currencyCode} {item.remainingValueOriginal.toFixed(2)}
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold">已过期节点</div>
          {snapshot.expired.map((item) => (
            <article key={item.uuid} className="rounded-2xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
              {item.name} · {item.currencySymbol}{item.price} / {item.billingCycle} 天 · 剩余价值 0
            </article>
          ))}
        </section>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={t("remainingValue.title", { defaultValue: "剩余价值计算器" })}
        onClick={() => void handleOpenChange(!open)}
        className="fixed bottom-6 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-105"
      >
        <Calculator className="h-5 w-5 text-primary" />
      </button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">剩余价值计算器</DrawerTitle>
            <DrawerDescription className="sr-only">
              查看节点剩余价值与汇率换算结果。
            </DrawerDescription>
            {panelBody}
          </DrawerContent>
        </Drawer>
      ) : (
        open && (
          <aside className="fixed bottom-20 right-4 z-40 w-[min(28rem,calc(100vw-2rem))]">
            {panelBody}
          </aside>
        )
      )}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RemainingValueCalculator.test.tsx`

Expected: PASS with 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/RemainingValueCalculator.tsx src/components/RemainingValueCalculator.test.tsx
git commit -m "feat: add floating remaining value calculator"
```

### Task 4: Mount Globally and Run Regression Verification

**Files:**
- Create: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\app\layout.test.tsx`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\app\layout.tsx`
- Re-run tests: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\VisitorInfoPanel.test.tsx`

- [ ] **Step 1: Write the failing integration expectation**

```tsx
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import RootLayout from "@/app/layout";

vi.mock("@/components/providers", () => ({
  Providers: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/NavBar", () => ({
  default: () => <div>nav</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div>footer</div>,
}));

vi.mock("@/components/VisitorInfoPanel", () => ({
  default: () => <div>visitor-panel</div>,
}));

vi.mock("@/components/RemainingValueCalculator", () => ({
  default: () => <button type="button" aria-label="剩余价值计算器" />,
}));

describe("RootLayout", () => {
  it("mounts the remaining value calculator globally", () => {
    render(
      <RootLayout>
        <div>dashboard</div>
      </RootLayout>,
    );

    expect(screen.getByRole("button", { name: "剩余价值计算器" })).toBeInTheDocument();
  });
});
```

This test fails before the layout import is updated because `RemainingValueCalculator` is not part of the rendered tree yet.

- [ ] **Step 2: Run focused regression tests before wiring**

Run: `npx vitest run src/app/layout.test.tsx`

Expected: FAIL because the calculator button is not mounted by `RootLayout` yet.

- [ ] **Step 3: Mount the calculator in the global layout**

```tsx
import type { Metadata } from "next";
import "@/global.css";
import { Providers } from "@/components/providers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import VisitorInfoPanel from "@/components/VisitorInfoPanel";
import RemainingValueCalculator from "@/components/RemainingValueCalculator";

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
          <RemainingValueCalculator />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run the full verification set**

Run: `npx vitest run src/lib/remainingValue.test.ts src/lib/exchangeRates.test.ts src/components/RemainingValueCalculator.test.tsx src/components/VisitorInfoPanel.test.tsx src/app/layout.test.tsx`

Expected: PASS with all calculator and visitor-panel tests green.

Run: `npm run build`

Expected: Next.js production build succeeds with no type or module errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: mount remaining value calculator globally"
```

## Self-Review

### Spec coverage

- Global lower-right floating button: Task 3
- Manual open with no auto-popup: Task 3
- Global summary counts and total: Task 3
- Per-node list sorted by converted value: Task 3 with Task 1 + Task 2 helpers
- Periodic, one-time, expired, and skipped rules: Task 1
- Display currency switching: Task 3
- Online exchange-rate fetch on open: Task 2 + Task 3
- One-hour local cache and stale fallback: Task 2
- Global mount in layout: Task 4
- Regression safety for existing visitor panel: Task 4

No uncovered spec items remain.

### Placeholder scan

- No placeholder markers remain.
- Each task has exact files, commands, expected failures, and expected passes.
- Provider choice is explicit: Frankfurter v2 rates endpoint.

### Type consistency

- Billing data comes from `NodeBasicInfo`.
- Remaining-value helper emits `RemainingValueSnapshot`.
- Exchange-rate helper returns `LoadedRates`.
- UI consumes the helper outputs without inventing alternate field names.

No naming mismatches remain in the plan.
