import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.restoreAllMocks();
  });

  it("opens from the floating button and uses content-width tab groups plus a refresh button", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    expect(screen.queryByTestId("remaining-value-panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));

    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();
    expect(screen.getByText("CNY 152.00")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "CNY" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "USD" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "EUR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /刷新/ })).toBeInTheDocument();
    expect(screen.getByTestId("remaining-value-rate-provider")).toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));
    expect(await screen.findByText("CNY 152.00")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "USD" }));

    expect(await screen.findByText("USD 23.75")).toBeInTheDocument();
  });

  it("filters between all, active, skipped and expired nodes", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));
    expect(await screen.findByTestId("remaining-value-panel")).toBeInTheDocument();

    const [, filterTabList] = screen.getAllByRole("tablist");
    const filterTabs = within(filterTabList).getAllByRole("tab");

    await user.click(filterTabs[2]);
    expect(screen.getByText("Missing Price")).toBeInTheDocument();
    expect(screen.queryByText("US VPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Expired VM")).not.toBeInTheDocument();

    await user.click(filterTabs[3]);
    expect(screen.getByText("Expired VM")).toBeInTheDocument();
    expect(screen.queryByText("Missing Price")).not.toBeInTheDocument();
    expect(screen.queryByText("US VPS")).not.toBeInTheDocument();

    await user.click(filterTabs[1]);
    expect(screen.getByText("US VPS")).toBeInTheDocument();
    expect(screen.getByText("Storage Box")).toBeInTheDocument();
    expect(screen.queryByText("Missing Price")).not.toBeInTheDocument();
  });

  it("shows long-term nodes as 长期 while still estimating them with a single cycle price", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue(mockRatesResponse) as unknown as typeof fetch;

    render(<RemainingValueCalculator />);

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));

    expect(await screen.findByText("US VPS")).toBeInTheDocument();
    expect(screen.getByText(/长期/)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "剩余价值计算器" }));

    await waitFor(() => {
      expect(screen.getByText("CNY 152.00")).toBeInTheDocument();
    });
  });
});
