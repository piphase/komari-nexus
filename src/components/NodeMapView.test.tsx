import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NodeMapView } from "@/components/NodeMapView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (typeof options?.defaultValue === "string") {
        return options.defaultValue;
      }
      return key;
    },
  }),
}));

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

const demoNodes = [
  {
    uuid: "us-core",
    name: "Virginia Core",
    region: "🇺🇸",
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
  },
  {
    uuid: "us-edge",
    name: "Dallas Edge",
    region: "🇺🇸",
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
    weight: 2,
    price: 0,
    tags: "",
    billing_cycle: 0,
    currency: "",
    group: "Edge",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    expired_at: "",
    ipv4: 0,
    ipv6: 0,
  },
  {
    uuid: "jp-edge",
    name: "Tokyo Edge",
    region: "🇯🇵",
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
    weight: 3,
    price: 0,
    tags: "",
    billing_cycle: 0,
    currency: "",
    group: "Asia",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    expired_at: "",
    ipv4: 0,
    ipv6: 0,
  },
] as const;

const demoLiveData = {
  online: ["us-core", "jp-edge"],
  data: {},
} as const;

const compactRegionNodes = [
  {
    uuid: "sg-core",
    name: "Singapore Core",
    region: "🇸🇬",
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
    group: "Asia",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    expired_at: "",
    ipv4: 0,
    ipv6: 0,
  },
] as const;

describe("NodeMapView", () => {
  it("renders active countries, hides UUIDs, and lets the user open node details from the sidebar", async () => {
    const user = userEvent.setup();
    const handleOpenNodeDetails = vi.fn();

    const { container } = render(
      <NodeMapView
        nodes={demoNodes}
        liveData={demoLiveData}
        onOpenNodeDetails={handleOpenNodeDetails}
      />
    );

    expect(container.querySelector('[data-country-code="US"]')).toBeInTheDocument();
    expect(screen.getByTestId("flag-🇺🇸")).toBeInTheDocument();

    expect(screen.getAllByText("3 台节点")[0]).toBeInTheDocument();
    expect(screen.getAllByText("2 台在线")[0]).toBeInTheDocument();
    expect(screen.getAllByText("1 台离线")[0]).toBeInTheDocument();
    expect(screen.getAllByText("United States")[0]).toBeInTheDocument();
    expect(screen.queryByText("us-core")).not.toBeInTheDocument();

    const japanCountry = container.querySelector('[data-country-code="JP"]');
    expect(japanCountry).toBeInTheDocument();

    await user.click(japanCountry as Element);

    expect(screen.getAllByText("Japan")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tokyo edge/i }));

    expect(handleOpenNodeDetails).toHaveBeenCalledWith("jp-edge");
  });

  it("shows a single country title in the detail header and keeps nodes inside a dedicated scroll area", () => {
    const { container } = render(
      <NodeMapView nodes={demoNodes} liveData={demoLiveData} />
    );

    const detailCard = container.querySelector(".node-map-view__detail-card");
    expect(detailCard).toBeInTheDocument();
    expect(within(detailCard as HTMLElement).getAllByText("United States")).toHaveLength(1);
    expect(screen.getByText("全球分布")).toBeInTheDocument();
    expect(screen.getByText("2 个活跃国家/地区")).toBeInTheDocument();
    expect(screen.getByText("全部在线")).toBeInTheDocument();
    expect(screen.getAllByText("部分在线")[0]).toBeInTheDocument();
    expect(screen.getByText("全部离线")).toBeInTheDocument();
    expect(screen.getByText("该地区共 2 台节点")).toBeInTheDocument();
    expect(screen.getByText("节点数")).toBeInTheDocument();
    expect(screen.getAllByText("在线")[0]).toBeInTheDocument();
    expect(screen.getAllByText("离线")[0]).toBeInTheDocument();

    expect(container.querySelector(".node-map-view__node-list")).toBeInTheDocument();
  });

  it("uses a callout marker and leader line for compact countries", () => {
    const { container } = render(
      <NodeMapView
        nodes={compactRegionNodes}
        liveData={{ online: ["sg-core"], data: {} }}
      />
    );

    expect(
      container.querySelector('[data-country-code="SG"][data-marker-placement="external"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-country-code="SG"][data-marker-strategy="callout"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-country-leader="SG"]')).toBeInTheDocument();
  });
});
