import { describe, expect, it } from "vitest";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { buildMapViewSummary } from "@/utils/mapRegions";

function createNode(uuid: string, region: string, name: string): NodeBasicInfo {
  return {
    uuid,
    name,
    region,
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
    group: "Test",
    traffic_limit: 0,
    traffic_limit_type: "sum",
    expired_at: "",
    ipv4: 0,
    ipv6: 0,
  };
}

describe("buildMapViewSummary", () => {
  it("maps standard ISO region codes without requiring a hand-written country allowlist", () => {
    const summary = buildMapViewSummary(
      [
        createNode("kp-node", "KP", "Pyongyang"),
        createNode("il-node", "IL", "Tel Aviv"),
        createNode("is-node", "IS", "Reykjavik"),
        createNode("gl-node", "GL", "Nuuk"),
      ],
      { online: [], data: {} },
    );

    expect(summary.unmappedNodes).toHaveLength(0);
    expect(summary.regions.map((region) => region.key).sort()).toEqual(["GL", "IL", "IS", "KP"]);
    expect(summary.regions.find((region) => region.key === "KP")?.mapName).toBe("North Korea");
    expect(summary.regions.find((region) => region.key === "IL")?.mapName).toBe("Israel");
    expect(summary.regions.find((region) => region.key === "IS")?.mapName).toBe("Iceland");
    expect(summary.regions.find((region) => region.key === "GL")?.mapName).toBe("Greenland");
  });

  it("keeps a tiny alias layer for map names that differ from standard display names", () => {
    const summary = buildMapViewSummary(
      [
        createNode("us-node", "US", "Virginia"),
        createNode("mo-node", "MO", "Macao"),
        createNode("hk-node", "HK", "Hong Kong"),
      ],
      { online: ["us-node"], data: {} },
    );

    expect(summary.unmappedNodes).toHaveLength(0);
    expect(summary.regions.find((region) => region.key === "US")?.mapName).toBe(
      "United States of America",
    );
    expect(summary.regions.find((region) => region.key === "MO")?.mapName).toBe("Macao");
    expect(summary.regions.find((region) => region.key === "HK")?.mapName).toBe("Hong Kong");
  });
});
