import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import Node from "@/components/Node";

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      "nodeCard.networkSpeed": "Network",
      "nodeCard.totalTraffic": "Traffic",
      "nodeCard.monthlyRemainingTraffic": "Monthly Remaining Traffic",
      "nodeCard.uploadAmount": "Upload",
      "nodeCard.downloadAmount": "Download",
      "nodeCard.trafficStatTypeSum": "Sum",
      "nodeCard.trafficStatTypeUp": "Upload Only",
      "nodeCard.trafficStatTypeDown": "Download Only",
      "nodeCard.trafficStatTypeMax": "Max",
      "nodeCard.trafficStatTypeMin": "Min",
      "nodeCard.pingStats": "Ping Stats",
      "nodeCard.noPingData": "No ping data",
      "nodeCard.online": "Online",
      "nodeCard.offline": "Offline",
      "nodeCard.time_hour": "h",
      "nodeCard.time_minute": "min",
      "nodeCard.time_second": "s",
      "nodeCard.time_day": "d",
      "chart.lossRate": "Loss",
      "chart.volatility": "Vol",
    };

    const t = (key: string, options?: Record<string, unknown>) =>
      translations[key] ?? (typeof options?.defaultValue === "string" ? options.defaultValue : key);

    return [t];
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

vi.mock("@/hooks/useDeferredVisibility", () => ({
  useDeferredVisibility: () => [null, false],
}));

vi.mock("@/hooks/usePingStats", () => ({
  usePingStats: () => ({
    hasData: false,
    avgLoss: 0,
    avgVolatility: 0,
  }),
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

const baseNode = {
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
  traffic_limit_type: "sum" as const,
  expired_at: "",
  ipv4: "",
  ipv6: "",
};

const baseLive = {
  cpu: { usage: 12.5 },
  ram: { used: 256 },
  disk: { used: 512 },
  network: {
    up: 128,
    down: 256,
    totalUp: 256 * 1024 ** 3,
    totalDown: 256 * 1024 ** 3,
  },
  uptime: 3600,
} as any;

describe("Node card monthly traffic display", () => {
  it("shows the monthly remaining traffic title, method, and upload/download details when traffic_limit > 0", () => {
    render(
      <Node
        basic={{ ...baseNode, traffic_limit: 2 * 1024 ** 4 }}
        live={baseLive}
        online
      />,
    );

    expect(screen.getByText("Monthly Remaining Traffic (Sum)")).toBeInTheDocument();
    expect(screen.getByText("1.50 TB / 2.00 TB")).toBeInTheDocument();
    expect(screen.getByText("Upload 256.00 GB")).toBeInTheDocument();
    expect(screen.getByText("Download 256.00 GB")).toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.queryByText("Traffic")).not.toBeInTheDocument();
  });

  it("keeps total traffic when traffic_limit is 0", () => {
    render(
      <Node
        basic={{ ...baseNode, traffic_limit: 0 }}
        live={baseLive}
        online
      />,
    );

    expect(screen.getByText("Traffic")).toBeInTheDocument();
    expect(screen.queryByText("Monthly Remaining Traffic (Sum)")).not.toBeInTheDocument();
  });

  it("clamps over-limit nodes to 0 B remaining and 0%", () => {
    render(
      <Node
        basic={{ ...baseNode, traffic_limit: 100 * 1024 ** 3 }}
        live={baseLive}
        online
      />,
    );

    expect(screen.getByText("0 B / 100.00 GB")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows the selected traffic stat method in the monthly remaining traffic title", () => {
    render(
      <Node
        basic={{
          ...baseNode,
          traffic_limit: 512 * 1024 ** 3,
          traffic_limit_type: "up",
        }}
        live={baseLive}
        online
      />,
    );

    expect(screen.getByText("Monthly Remaining Traffic (Upload Only)")).toBeInTheDocument();
    expect(screen.getByText("256.00 GB / 512.00 GB")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });

  it("uses green, yellow, and red classes for remaining traffic thresholds", () => {
    const { rerender } = render(
      <Node
        basic={{ ...baseNode, traffic_limit: 1024 ** 4 }}
        live={{
          ...baseLive,
          network: {
            ...baseLive.network,
            totalUp: 100 * 1024 ** 3,
            totalDown: 100 * 1024 ** 3,
          },
        }}
        online
      />,
    );

    expect(screen.getByTestId("monthly-traffic-progress-bar").className).toContain("bg-emerald");
    expect(screen.getByTestId("monthly-traffic-percentage").className).toContain("text-emerald");

    rerender(
      <Node
        basic={{ ...baseNode, traffic_limit: 1024 ** 4 }}
        live={{
          ...baseLive,
          network: {
            ...baseLive.network,
            totalUp: 350 * 1024 ** 3,
            totalDown: 150 * 1024 ** 3,
          },
        }}
        online
      />,
    );

    expect(screen.getByTestId("monthly-traffic-progress-bar").className).toContain("bg-amber");
    expect(screen.getByTestId("monthly-traffic-percentage").className).toContain("text-amber");

    rerender(
      <Node
        basic={{ ...baseNode, traffic_limit: 1024 ** 4 }}
        live={{
          ...baseLive,
          network: {
            ...baseLive.network,
            totalUp: 450 * 1024 ** 3,
            totalDown: 350 * 1024 ** 3,
          },
        }}
        online
      />,
    );

    expect(screen.getByTestId("monthly-traffic-progress-bar").className).toContain("bg-rose");
    expect(screen.getByTestId("monthly-traffic-percentage").className).toContain("text-rose");
  });
});
