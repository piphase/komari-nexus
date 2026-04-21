import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NodeMapView } from "@/components/NodeMapView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "mapView.title": "Global Distribution",
        "mapView.activeCountries": "{{count}} active countries / regions",
        "mapView.servers": "{{count}} servers",
        "mapView.online": "{{count}} online",
        "mapView.offline": "{{count}} offline",
        "nodeCard.online": "Online",
        "nodeCard.offline": "Offline",
        "mapView.legend.online": "Fully online",
        "mapView.legend.partial": "Partially online",
        "mapView.legend.offline": "Fully offline",
        "mapView.unmappedRegions": "Unmapped Regions",
        "mapView.unmappedCount": "Total {{count}} items",
        "mapView.regionNodes": "{{count}} nodes in this region",
        "mapView.stats.nodes": "Nodes",
        "mapView.unclassified": "Unclassified",
        "mapView.viewDetails": "View details for {{name}}",
        "mapView.emptySelectionTitle": "No regions can be displayed right now",
        "mapView.emptySelectionDescription":
          "These nodes are still counted normally, but their region values do not yet match the map mapping.",
      };

      const template = translations[key];
      if (template) {
        return Object.entries(options ?? {}).reduce(
          (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
          template,
        );
      }

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
  },
  {
    uuid: "us-edge",
    name: "Dallas Edge",
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
    weight: 2,
    price: 0,
    tags: "",
    billing_cycle: 0,
    currency: "",
    group: "",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    expired_at: "",
    ipv4: 0,
    ipv6: 0,
  },
  {
    uuid: "jp-edge",
    name: "Tokyo Edge",
    region: "JP",
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
    region: "SG",
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

const nodesWithUnmappedRegion = [
  {
    uuid: "mapped-us",
    name: "Los Angeles Core",
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
  },
  {
    uuid: "unknown-region",
    name: "Mystery Relay",
    region: "Mars Colony",
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
    group: "Lab",
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
      />,
    );

    expect(container.querySelector('[data-country-code="US"]')).toBeInTheDocument();
    expect(screen.getByTestId(/flag-/)).toBeInTheDocument();

    expect(screen.getAllByText("3 servers")[0]).toBeInTheDocument();
    expect(screen.getAllByText("2 online")[0]).toBeInTheDocument();
    expect(screen.getAllByText("1 offline")[0]).toBeInTheDocument();
    expect(screen.getAllByText("United States")[0]).toBeInTheDocument();
    expect(screen.queryByText("us-core")).not.toBeInTheDocument();
    expect(screen.getByText("Unclassified")).toBeInTheDocument();

    const japanCountry = container.querySelector('[data-country-code="JP"]');
    expect(japanCountry).toBeInTheDocument();

    await user.click(japanCountry as Element);

    expect(screen.getAllByText("Japan")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tokyo edge/i }));

    expect(handleOpenNodeDetails).toHaveBeenCalledWith("jp-edge");
  });

  it("shows translated legend and region detail copy inside the dedicated scroll area", () => {
    const { container } = render(<NodeMapView nodes={demoNodes} liveData={demoLiveData} />);

    const detailCard = container.querySelector(".node-map-view__detail-card");
    const mapSurface = container.querySelector(".node-map-view__surface");
    const legend = container.querySelector(".node-map-view__legend");
    const statusLegendCard = container.querySelector(".node-map-view__legend-card--status");
    const statusLegendItems = container.querySelector(".node-map-view__legend-items--stacked");

    expect(detailCard).toBeInTheDocument();
    expect(mapSurface).toBeInTheDocument();
    expect(legend).toBeInTheDocument();
    expect(statusLegendCard).toBeInTheDocument();
    expect(statusLegendItems).toBeInTheDocument();
    expect(statusLegendCard?.querySelector("svg")).not.toBeInTheDocument();
    expect(mapSurface?.querySelector(".node-map-view__legend")).toBeInTheDocument();
    expect(legend).toHaveClass("node-map-view__legend--inset");
    expect(container.querySelector(".node-map-view__map-panel")).not.toBeInTheDocument();
    expect(within(detailCard as HTMLElement).getAllByText("United States")).toHaveLength(1);
    expect(screen.getByText("Global Distribution")).toBeInTheDocument();
    expect(screen.getByText("2 active countries / regions")).toBeInTheDocument();
    expect(screen.getByText("Fully online")).toBeInTheDocument();
    expect(screen.getAllByText("Partially online")[0]).toBeInTheDocument();
    expect(screen.getByText("Fully offline")).toBeInTheDocument();
    expect(screen.getByText("2 nodes in this region")).toBeInTheDocument();
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getAllByText("Online")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Offline")[0]).toBeInTheDocument();
    expect(container.querySelector(".node-map-view__node-list")).toBeInTheDocument();
  });

  it("uses theme-aware classes for dark-mode-sensitive text and cards in the detail panel", () => {
    const { container } = render(<NodeMapView nodes={demoNodes} liveData={demoLiveData} />);

    const detailTitle = screen.getAllByText("United States")[0];
    const detailSubtitle = container.querySelector(".node-map-view__detail-heading p");
    const nodeName = screen.getByText("Virginia Core");
    const nodeMeta = screen.getByText("Core");
    const nodeCard = container.querySelector(".node-map-view__node-card");

    expect(detailTitle).toHaveClass("text-foreground");
    expect(detailSubtitle).toHaveClass("text-muted-foreground");
    expect(nodeName).toHaveClass("text-foreground");
    expect(nodeMeta).toHaveClass("text-muted-foreground");
    expect(nodeCard).toHaveClass("bg-card/80");
  });

  it("keeps compact countries clickable without rendering markers or leader lines", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NodeMapView nodes={compactRegionNodes} liveData={{ online: ["sg-core"], data: {} }} />,
    );

    const singaporeCountry = container.querySelector('[data-country-code="SG"]');
    expect(singaporeCountry).toBeInTheDocument();
    expect(container.querySelector(".node-map-view__marker-layer")).not.toBeInTheDocument();
    expect(container.querySelector('[data-country-leader="SG"]')).not.toBeInTheDocument();

    await user.click(singaporeCountry as Element);

    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getByText("1 nodes in this region")).toBeInTheDocument();
  });

  it("shows translated unmapped region details so missing map coverage can be diagnosed quickly", () => {
    render(
      <NodeMapView
        nodes={nodesWithUnmappedRegion}
        liveData={{ online: ["mapped-us"], data: {} }}
      />,
    );

    expect(screen.getByText("Unmapped Regions")).toBeInTheDocument();
    expect(screen.getByText("Total 1 items")).toBeInTheDocument();
    expect(screen.getByText("Mars Colony")).toBeInTheDocument();
    expect(screen.getByText("Mystery Relay")).toBeInTheDocument();
  });
});
