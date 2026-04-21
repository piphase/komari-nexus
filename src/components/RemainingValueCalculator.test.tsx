import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RemainingValueCalculator from "@/components/RemainingValueCalculator";

let translationReady = true;
let mounted = true;

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      "remainingValue.title": "Remaining Value Calculator",
      "remainingValue.description": "Check node remaining value and exchange-rate conversions.",
      "remainingValue.total": "Total Remaining Value",
      "remainingValue.rateStatus.loading": "Waiting for exchange rates",
      "remainingValue.rateStatus.updatedAt": "Exchange rates updated at {{value}}",
      "remainingValue.rateStatus.stale": "Exchange rates are not the latest",
      "remainingValue.refreshRates": "Refresh Rates",
      "remainingValue.rateProvider":
        "Online exchange rates are powered by Frankfurter and are only requested after you open the calculator.",
      "remainingValue.filter.all": "All {{count}}",
      "remainingValue.filter.active": "Included {{count}}",
      "remainingValue.filter.skipped": "Skipped {{count}}",
      "remainingValue.filter.expired": "Expired {{count}}",
      "remainingValue.placeholderPending": "Pending conversion",
      "remainingValue.billingCycle.once": "One-time",
      "remainingValue.billingCycle.days": "{{count}} days",
      "remainingValue.remainingTime.longTerm": "Long term",
      "remainingValue.remainingTime.oneTime": "One-time",
      "remainingValue.remainingTime.value": "{{days}} days {{hours}} hours",
      "remainingValue.section.active": "Included Nodes",
      "remainingValue.section.skipped": "Skipped Nodes",
      "remainingValue.section.expired": "Expired Nodes",
      "remainingValue.card.originalPrice": "Original price {{amount}} / {{cycle}}",
      "remainingValue.card.remainingTime": "Remaining time {{value}}",
      "remainingValue.card.originalValue": "Original currency value {{amount}}",
      "remainingValue.card.skipReason": "Skipped because",
      "remainingValue.card.expiredValue": "Remaining value 0",
      "remainingValue.skipReason.missing_price": "Price not set",
      "remainingValue.empty.none": "There are no nodes to display right now",
      "remainingValue.empty.active": "There are no included nodes right now",
      "remainingValue.empty.skipped": "There are no skipped nodes right now",
      "remainingValue.empty.expired": "There are no expired nodes right now",
    };

    const translate = (key: string, options?: Record<string, unknown>) => {
      const template = translations[key];
      if (template) {
        return Object.entries(options ?? {}).reduce(
          (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
          template,
        );
      }

      return typeof options?.defaultValue === "string" ? options.defaultValue : key;
    };

    return {
      t: translate,
      i18n: {
        isInitialized: translationReady,
      },
      ready: translationReady,
    };
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: () => mounted,
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
        expired_at: "2200-05-04T12:00:00.000Z",
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
        currency: "\u00a5",
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
        uuid: "missing-price",
        name: "Missing Price",
        cpu_name: "",
        virtualization: "",
        arch: "x86_64",
        cpu_cores: 2,
        os: "Debian",
        kernel_version: "",
        gpu_name: "",
        region: "JP",
        mem_total: 0,
        swap_total: 0,
        disk_total: 0,
        version: "",
        weight: 0,
        price: 0,
        tags: "",
        billing_cycle: 30,
        currency: "$",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "2099-05-04T12:00:00.000Z",
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
        currency: "\u20ac",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "2000-04-10T12:00:00.000Z",
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

const mockRatesResponse = {
  ok: true,
  json: async () => [
    { base: "EUR", quote: "USD", rate: 1.25, date: "2026-04-19" },
    { base: "EUR", quote: "CNY", rate: 8, date: "2026-04-19" },
  ],
} as Response;

describe("RemainingValueCalculator", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
    translationReady = true;
    mounted = true;
    vi.restoreAllMocks();
  });

  it("waits for mount and i18n readiness before rendering the calculator entry", () => {
    mounted = false;
    translationReady = false;

    const { rerender } = render(<RemainingValueCalculator />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    mounted = true;
    rerender(<RemainingValueCalculator />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    translationReady = true;
    rerender(<RemainingValueCalculator />);
    expect(screen.getByRole("button", { name: "Remaining Value Calculator" })).toBeInTheDocument();
  });

  it("opens from the floating button and shows translated controls", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    expect(screen.queryByTestId("remaining-value-panel")).not.toBeInTheDocument();

    const floatingButton = screen.getByRole("button", { name: "Remaining Value Calculator" });
    expect(floatingButton).toHaveClass("bg-card/95");
    expect(floatingButton).toHaveClass("ring-1");
    expect(floatingButton).toHaveClass("dark:ring-white/12");

    await user.click(floatingButton);

    const panel = await screen.findByTestId("remaining-value-panel");
    expect(panel).toHaveClass("bg-card/95");
    expect(panel).toHaveClass("ring-1");
    expect(panel).toHaveClass("dark:ring-white/12");
    expect(screen.getByText("CNY 152.00")).toBeInTheDocument();
    expect(screen.getByText("CNY 152.00").closest("section")).toHaveClass("bg-muted/55");
    expect(screen.getByRole("tab", { name: "CNY" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "USD" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "EUR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh rates/i })).toBeInTheDocument();
    expect(screen.getByTestId("remaining-value-rate-provider")).toHaveTextContent(
      "Online exchange rates are powered by Frankfurter",
    );

    const [currencyTabList, filterTabList] = screen.getAllByRole("tablist");
    expect(currencyTabList).toHaveClass("w-fit");
    expect(currencyTabList).not.toHaveClass("w-full");
    expect(filterTabList).toHaveClass("w-fit");
    expect(filterTabList).not.toHaveClass("w-full");
  });

  it("switches currency tabs and updates the converted total", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "Remaining Value Calculator" }));
    expect(await screen.findByText("CNY 152.00")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "USD" }));

    expect(await screen.findByText("USD 23.75")).toBeInTheDocument();
  });

  it("shows a readable translated placeholder before exchange rates finish loading", async () => {
    const user = userEvent.setup();

    let resolveFetch: ((value: Response) => void) | null = null;
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "Remaining Value Calculator" }));

    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();
    expect(screen.getAllByText("Pending conversion").length).toBeGreaterThan(0);
    expect(screen.queryByText("閺嗗倹婀幑銏㈢暬")).not.toBeInTheDocument();

    resolveFetch?.(mockRatesResponse);

    await waitFor(() => {
      expect(screen.getByText("CNY 152.00")).toBeInTheDocument();
    });
  });

  it("filters between all, active, skipped and expired nodes", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "Remaining Value Calculator" }));
    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "All 4" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Included 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Skipped 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Expired 1" })).toBeInTheDocument();

    const [, filterTabList] = screen.getAllByRole("tablist");
    const filterTabs = within(filterTabList).getAllByRole("tab");

    await user.click(filterTabs[2]);
    expect(screen.getByText("Missing Price")).toBeInTheDocument();
    expect(screen.getByText("Skipped because")).toBeInTheDocument();
    expect(screen.getByText("Price not set")).toBeInTheDocument();
    expect(screen.queryByText("US VPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Expired VM")).not.toBeInTheDocument();

    await user.click(filterTabs[3]);
    expect(screen.getByText("Expired VM")).toBeInTheDocument();
    expect(screen.getByText("Remaining value 0")).toBeInTheDocument();
    expect(screen.queryByText("Missing Price")).not.toBeInTheDocument();
    expect(screen.queryByText("US VPS")).not.toBeInTheDocument();

    await user.click(filterTabs[1]);
    expect(screen.getByText("US VPS")).toBeInTheDocument();
    expect(screen.getByText("Storage Box")).toBeInTheDocument();
    expect(screen.queryByText("Missing Price")).not.toBeInTheDocument();
  });

  it("shows long-term nodes as translated long term while still estimating them with a single cycle price", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "Remaining Value Calculator" }));

    expect(await screen.findByText("US VPS")).toBeInTheDocument();
    expect(screen.getByText(/Long term/)).toBeInTheDocument();
    expect(screen.getByText(/USD 10\.00/)).toBeInTheDocument();
  });

  it("opens from the shared external trigger event", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await act(async () => {
      window.dispatchEvent(new CustomEvent("open-remaining-value-calculator"));
    });

    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();
  });

  it("falls back to cached rates when the network request fails", async () => {
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

    await user.click(screen.getByRole("button", { name: "Remaining Value Calculator" }));

    await waitFor(() => {
      expect(screen.getByText("CNY 152.00")).toBeInTheDocument();
    });
  });
});
