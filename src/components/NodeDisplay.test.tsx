import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NodeDisplay from "@/components/NodeDisplay";

vi.mock("react-i18next", () => ({
  useTranslation: () => [
    (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === "string" ? options.defaultValue : key,
  ],
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

vi.mock("@/components/instance/NodeDetailsPanel", () => ({
  NodeDetailsPanel: ({
    open,
    uuid,
  }: {
    open: boolean;
    uuid: string | null;
  }) =>
    open && uuid ? <div>{`details:${uuid}`}</div> : null,
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
  it("shows map as a third node view", () => {
    render(
      <NodeDisplay
        nodes={[demoNode]}
        liveData={demoLiveData}
      />
    );

    expect(screen.getByRole("button", { name: /map/i })).toBeInTheDocument();
  });

  it("opens details when a classic card is clicked", async () => {
    const user = userEvent.setup();

    render(
      <NodeDisplay
        nodes={[demoNode]}
        liveData={demoLiveData}
      />
    );

    await user.click(screen.getByText("Demo Node"));

    expect(screen.getByText("details:demo-node")).toBeInTheDocument();
  });
});
