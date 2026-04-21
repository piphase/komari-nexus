import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NodeDisplay from "@/components/NodeDisplay";

const usePingStatsMock = vi.fn(() => ({
  hasData: false,
  avgLoss: 0,
  avgVolatility: 0,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      "common.all": "All",
      "common.map": "Map",
      "mapView.title": "Global Distribution",
      "nodeDisplay.grid": "Cards",
      "nodeDisplay.table": "List",
      "nodeDisplay.remainingValueCalculator": "Remaining Value Calculator",
      "nodeCard.pingStats": "Ping Stats",
      "chart.lossRate": "Loss",
      "chart.volatility": "Volatility",
    };

    const translate = (key: string, options?: Record<string, unknown>) =>
      translations[key] ?? (typeof options?.defaultValue === "string" ? options.defaultValue : key);

    return Object.assign([translate], { t: translate });
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    themeConfig: {
      cardLayout: "classic",
      graphDesign: "circle",
    },
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/usePingStats", () => ({
  usePingStats: (...args: unknown[]) => usePingStatsMock(...args),
}));

vi.mock("@/utils", () => ({
  getOSImage: () => "/test-os.svg",
  getOSName: (os: string) => os,
}));

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span>{flag}</span>,
}));

vi.mock("@/components/PriceTags", () => ({
  default: () => <div>price-tags</div>,
}));

vi.mock("@/components/AdaptiveChart", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/MiniPingChartFloat", () => ({
  default: ({
    trigger,
  }: {
    trigger: React.ReactNode;
  }) => <div>{trigger}</div>,
}));

vi.mock("@/components/ui/tips", () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/instance/NodeDetailsPanel", () => ({
  NodeDetailsPanel: ({
    open,
    uuid,
  }: {
    open: boolean;
    uuid: string | null;
  }) => (open && uuid ? <div>{`details:${uuid}`}</div> : null),
}));

vi.mock("@/components/NodeTable", () => ({
  default: () => <div>node-table</div>,
}));

const demoNode = {
  uuid: "demo-node",
  name: "Demo Node",
  region: "US",
  os: "Debian",
  arch: "x86_64",
  cpu_name: "Demo CPU",
  virtualization: "KVM",
  cpu_cores: 4,
  kernel_version: "6.1.0",
  gpu_name: "",
  mem_total: 1024,
  swap_total: 0,
  disk_total: 2048,
  version: "",
  weight: 1,
  price: 0,
  tags: "",
  billing_cycle: 0,
  currency: "",
  group: "Core",
  traffic_limit: 0,
  traffic_limit_type: "sum",
  expired_at: "",
  ipv4: 0,
  ipv6: 0,
} as const;

const demoLiveData = {
  online: ["demo-node"],
  data: {
    "demo-node": {
      cpu: { usage: 12.5 },
      ram: { used: 256 },
      disk: { used: 512 },
      network: {
        up: 128,
        down: 256,
        totalUp: 1024,
        totalDown: 2048,
      },
      uptime: 3600,
      updated_at: "2026-04-18T12:00:00.000Z",
    },
  },
} as const;

describe("NodeDisplay classic cards", () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePingStatsMock.mockClear();
  });

  it("uses translated view labels and defaults to the map view", () => {
    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    expect(screen.getByRole("button", { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cards/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /list/i })).toBeInTheDocument();
    expect(screen.getByText("Global Distribution")).toBeInTheDocument();
    expect(screen.queryByText("node-table")).not.toBeInTheDocument();
  });

  it("opens details when a classic card is clicked", async () => {
    const user = userEvent.setup();

    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    await user.click(screen.getByText("Demo Node"));

    expect(screen.getByText("details:demo-node")).toBeInTheDocument();
  });

  it("does not keep the previous view visible after switching to the list view", async () => {
    const user = userEvent.setup();

    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    expect(screen.getByText("Global Distribution")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /list/i }));

    expect(screen.getByText("node-table")).toBeInTheDocument();
    expect(screen.queryByText("Global Distribution")).not.toBeInTheDocument();
  });

  it("keeps the current view button visibly highlighted", async () => {
    const user = userEvent.setup();

    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    const mapButton = screen.getByRole("button", { name: "Map" });
    const tableButton = screen.getByRole("button", { name: "List" });

    expect(mapButton.className).toContain("border-border/80");
    expect(mapButton.className).toContain("ring-1");
    expect(mapButton.className).toContain("text-foreground");
    expect(tableButton.className).toContain("text-muted-foreground");

    await user.click(tableButton);

    expect(tableButton.className).toContain("border-border/80");
    expect(tableButton.className).toContain("ring-1");
    expect(tableButton.className).toContain("text-foreground");
    expect(mapButton.className).toContain("text-muted-foreground");
  });

  it("shows a remaining value calculator entry and dispatches the shared open event", async () => {
    const user = userEvent.setup();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    const openButton = screen.getByRole("button", { name: "Remaining Value Calculator" });

    await user.click(openButton);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "open-remaining-value-calculator",
      }),
    );
  });

  it("keeps the remaining value calculator entry visually aligned with the dark card style", () => {
    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    const openButton = screen.getByRole("button", { name: "Remaining Value Calculator" });

    expect(openButton.className).toContain("bg-card/95");
    expect(openButton.className).toContain("border-border/80");
    expect(openButton.className).toContain("ring-1");
  });

  it("restores the card ping summary hook when cards are shown", async () => {
    const user = userEvent.setup();

    render(<NodeDisplay nodes={[demoNode]} liveData={demoLiveData} />);

    await user.click(screen.getByRole("button", { name: /cards/i }));

    expect(usePingStatsMock).toHaveBeenCalledWith("demo-node", 24, {
      enabled: false,
    });
  });

  it("reveals cards in batches of 10 before loading the rest", () => {
    vi.useFakeTimers();
    const manyNodes = Array.from({ length: 12 }, (_, index) => ({
      ...demoNode,
      uuid: `demo-node-${index + 1}`,
      name: `Demo Node ${index + 1}`,
    }));
    const manyLiveData = {
      online: manyNodes.map((node) => node.uuid),
      data: Object.fromEntries(
        manyNodes.map((node) => [
          node.uuid,
          {
            ...demoLiveData.data["demo-node"],
          },
        ]),
      ),
    };

    render(<NodeDisplay nodes={manyNodes} liveData={manyLiveData} />);

    fireEvent.click(screen.getByRole("button", { name: /cards/i }));

    expect(screen.getByText("Demo Node 1")).toBeInTheDocument();
    expect(screen.getByText("Demo Node 10")).toBeInTheDocument();
    expect(screen.queryByText("Demo Node 11")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo Node 12")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText("Demo Node 11")).toBeInTheDocument();
    expect(screen.getByText("Demo Node 12")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("continues auto-loading later card batches without requiring scroll", () => {
    vi.useFakeTimers();
    const manyNodes = Array.from({ length: 25 }, (_, index) => ({
      ...demoNode,
      uuid: `demo-node-${index + 1}`,
      name: `Demo Node ${index + 1}`,
    }));
    const manyLiveData = {
      online: manyNodes.map((node) => node.uuid),
      data: Object.fromEntries(
        manyNodes.map((node) => [
          node.uuid,
          {
            ...demoLiveData.data["demo-node"],
          },
        ]),
      ),
    };

    render(<NodeDisplay nodes={manyNodes} liveData={manyLiveData} />);

    fireEvent.click(screen.getByRole("button", { name: /cards/i }));

    expect(screen.queryByText("Demo Node 11")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo Node 21")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(screen.getByText("Demo Node 11")).toBeInTheDocument();
    expect(screen.getByText("Demo Node 20")).toBeInTheDocument();
    expect(screen.queryByText("Demo Node 21")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(screen.getByText("Demo Node 21")).toBeInTheDocument();
    expect(screen.getByText("Demo Node 25")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
