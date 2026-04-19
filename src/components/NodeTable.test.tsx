import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import NodeTable from "@/components/NodeTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translate = (key: string) => key;
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

vi.mock("@/components/AdaptiveChart", () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/components/Flag", () => ({
  default: () => <span>flag</span>,
}));

vi.mock("@/components/PriceTags", () => ({
  default: () => <span>price</span>,
}));

vi.mock("@/components/ui/tips", () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/DetailsGrid", () => ({
  DetailsGrid: () => <div>details-grid</div>,
}));

vi.mock("@/components/MiniPingChart", () => ({
  default: () => <div>mini-ping</div>,
}));

vi.mock("@/utils", () => ({
  getOSImage: () => "/os.svg",
}));

vi.mock("@/components/Node", () => ({
  formatUptime: () => "uptime",
}));

describe("NodeTable", () => {
  it("pulls the usage area back another step without shrinking the rings", () => {
    const nodes = [
      {
        uuid: "node-1",
        name: "Demo Node",
        region: "US",
        os: "Debian",
        arch: "x86_64",
        cpu_name: "CPU",
        virtualization: "KVM",
        cpu_cores: 4,
        kernel_version: "6.1",
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
        ipv4: 1,
        ipv6: 1,
      },
    ] as const;

    const liveData = {
      online: ["node-1"],
      data: {
        "node-1": {
          cpu: { usage: 25 },
          ram: { used: 256 },
          disk: { used: 512 },
          network: { up: 1, down: 2, totalUp: 3, totalDown: 4 },
          uptime: 3600,
        },
      },
    } as const;

    const { container } = render(<NodeTable nodes={[...nodes]} liveData={liveData} />);

    expect(container.querySelector(".min-w-\\[1240px\\]")).toBeTruthy();
    expect(screen.getAllByText("nodeCard.cpu")[0]?.closest("th")).toHaveClass("w-[124px]");
    expect(screen.getAllByText("nodeCard.ram")[0]?.closest("th")).toHaveClass("w-[124px]");
    expect(screen.getAllByText("nodeCard.disk")[0]?.closest("th")).toHaveClass("w-[124px]");
    expect(screen.getAllByText("nodeCard.cpu")[1]?.closest('[data-slot=\"table-cell\"]')).toHaveClass("py-3");
  });
});
