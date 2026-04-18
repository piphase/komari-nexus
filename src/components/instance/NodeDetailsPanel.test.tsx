import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NodeDetailsContent } from "@/components/instance/NodeDetailsContent";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/contexts/NodeListContext", () => ({
  useNodeList: () => ({
    nodeList: [
      {
        uuid: "demo-node",
        name: "Demo Node",
        region: "🇬🇧",
        os: "Debian",
        arch: "x86_64",
        cpu_name: "Demo CPU",
        virtualization: "KVM",
        cpu_cores: 2,
        kernel_version: "6.1.0",
        gpu_name: "",
        mem_total: 1024,
        swap_total: 0,
        disk_total: 2048,
        version: "",
        weight: 0,
        price: 0,
        tags: "",
        billing_cycle: 0,
        currency: "",
        group: "",
        traffic_limit: 0,
        traffic_limit_type: "sum",
        expired_at: "",
        created_at: "",
        updated_at: "2026-04-18T12:00:00.000Z",
      },
    ],
  }),
}));

vi.mock("@/contexts/LiveDataContext", () => ({
  useLiveData: () => ({
    onRefresh: vi.fn(() => vi.fn()),
  }),
}));

vi.mock("@/components/DetailsGrid", () => ({
  DetailsGrid: ({ uuid }: { uuid: string }) => <div>details-grid:{uuid}</div>,
}));

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span>{flag}</span>,
}));

vi.mock("./LoadChart", () => ({
  default: ({ uuid }: { uuid: string }) => <div>load-chart:{uuid}</div>,
}));

vi.mock("./PingChart", () => ({
  default: ({ uuid }: { uuid: string }) => <div>ping-chart:{uuid}</div>,
}));

vi.mock("@/utils/RecordHelper", () => ({
  liveDataToRecords: vi.fn(() => []),
}));

describe("NodeDetailsContent", () => {
  it("renders the node identity for a supplied uuid", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined))
    );

    render(<NodeDetailsContent uuid="demo-node" />);

    expect(screen.getByText("Demo Node")).toBeInTheDocument();
    expect(screen.getByText("demo-node")).toBeInTheDocument();
  });
});
