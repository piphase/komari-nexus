import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NodeMapView } from "@/components/NodeMapView";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "mapView.servers") {
        return `${options?.count ?? 0} servers`;
      }
      if (key === "mapView.online") {
        return `${options?.count ?? 0} online`;
      }
      if (key === "mapView.offline") {
        return `${options?.count ?? 0} offline`;
      }
      if (typeof options?.defaultValue === "string") {
        return options.defaultValue;
      }
      return key;
    },
  }),
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

describe("NodeMapView", () => {
  it("shows aggregated totals and lets the user focus another region", async () => {
    const user = userEvent.setup();

    render(
      <NodeMapView
        nodes={demoNodes}
        liveData={demoLiveData}
      />
    );

    expect(screen.getAllByText("3 servers")[0]).toBeInTheDocument();
    expect(screen.getAllByText("2 online")[0]).toBeInTheDocument();
    expect(screen.getAllByText("1 offline")[0]).toBeInTheDocument();
    expect(screen.getAllByText("United States")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /japan/i }));

    expect(screen.getAllByText("Japan")[0]).toBeInTheDocument();
    expect(screen.getByText("Tokyo Edge")).toBeInTheDocument();
  });
});
