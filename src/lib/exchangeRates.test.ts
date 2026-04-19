import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  convertAmount,
  loadRates,
  writeRatesCache,
} from "@/lib/exchangeRates";

describe("exchangeRates", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("converts amounts using a shared base rate map", () => {
    const rates = {
      EUR: 1,
      USD: 1.25,
      CNY: 8,
    };

    expect(convertAmount(10, "USD", "CNY", rates)).toBeCloseTo(64, 5);
    expect(convertAmount(64, "CNY", "USD", rates)).toBeCloseTo(10, 5);
    expect(convertAmount(10, "USD", "USD", rates)).toBe(10);
    expect(convertAmount(10, "USD", "GBP", rates)).toBeNull();
  });

  it("uses fresh cache without performing a network request", async () => {
    writeRatesCache({
      fetchedAt: "2026-04-19T12:00:00.000Z",
      base: "EUR",
      rates: {
        EUR: 1,
        USD: 1.25,
        CNY: 8,
      },
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
    expect(result.isStale).toBe(false);
    expect(result.rates.CNY).toBe(8);
  });

  it("falls back to stale cache when the network request fails", async () => {
    writeRatesCache({
      fetchedAt: "2026-04-19T08:00:00.000Z",
      base: "EUR",
      rates: {
        EUR: 1,
        USD: 1.2,
        CNY: 7.8,
      },
      provider: "frankfurter",
    });

    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await loadRates({
      displayCurrency: "CNY",
      sourceCurrencies: ["USD", "CNY"],
      now: new Date("2026-04-19T12:30:00.000Z"),
    });

    expect(result.source).toBe("stale-cache");
    expect(result.isStale).toBe(true);
    expect(result.rates.USD).toBe(1.2);
  });
});
