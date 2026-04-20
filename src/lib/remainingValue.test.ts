import { describe, expect, it } from "vitest";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import {
  buildRemainingValueSnapshot,
  normalizeCurrencyCode,
} from "@/lib/remainingValue";

const baseNode: NodeBasicInfo = {
  uuid: "node-base",
  name: "Base Node",
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
  price: 0,
  tags: "",
  billing_cycle: 0,
  currency: "",
  group: "",
  traffic_limit: 0,
  traffic_limit_type: "sum",
  expired_at: "",
  created_at: "",
  updated_at: "",
  ipv4: "",
  ipv6: "",
};

const createNode = (patch: Partial<NodeBasicInfo>): NodeBasicInfo => ({
  ...baseNode,
  ...patch,
});

describe("remainingValue", () => {
  it("normalizes supported currency symbols and ISO codes", () => {
    expect(normalizeCurrencyCode("\u00a5")).toBe("CNY");
    expect(normalizeCurrencyCode("$")).toBe("USD");
    expect(normalizeCurrencyCode("\u20ac")).toBe("EUR");
    expect(normalizeCurrencyCode("usd")).toBe("USD");
    expect(normalizeCurrencyCode("")).toBeNull();
    expect(normalizeCurrencyCode("???")).toBeNull();
  });

  it("classifies active, expired, and skipped nodes with correct remaining values", () => {
    const snapshot = buildRemainingValueSnapshot(
      [
        createNode({
          uuid: "periodic-active",
          name: "US VPS",
          price: 10,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2026-05-04T12:00:00.000Z",
        }),
        createNode({
          uuid: "one-time",
          name: "Storage Box",
          price: 88,
          billing_cycle: -1,
          currency: "\u00a5",
        }),
        createNode({
          uuid: "prepaid-quarter",
          name: "Quarterly Prepaid",
          price: 12,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2026-07-18T12:00:00.000Z",
        }),
        createNode({
          uuid: "long-term-node",
          name: "Long Term Node",
          price: 18,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2200-04-19T12:00:00.000Z",
        }),
        createNode({
          uuid: "expired-node",
          name: "Expired VM",
          price: 15,
          billing_cycle: 30,
          currency: "\u20ac",
          expired_at: "2026-04-10T12:00:00.000Z",
        }),
        createNode({
          uuid: "missing-price",
          name: "Free Trial",
          price: 0,
          billing_cycle: 30,
          currency: "$",
          expired_at: "2026-05-10T12:00:00.000Z",
        }),
        createNode({
          uuid: "missing-expired-at",
          name: "Unknown Renewal",
          price: 5,
          billing_cycle: 30,
          currency: "$",
          expired_at: "",
        }),
      ],
      new Date("2026-04-19T12:00:00.000Z"),
    );

    expect(snapshot.active).toHaveLength(4);
    expect(snapshot.expired).toHaveLength(1);
    expect(snapshot.skipped).toHaveLength(2);

    const periodicNode = snapshot.active.find((item) => item.uuid === "periodic-active");
    expect(periodicNode).toMatchObject({
      currencyCode: "USD",
      status: "active",
    });
    expect(periodicNode?.remainingRatio).toBeCloseTo(0.5, 5);
    expect(periodicNode?.remainingValueOriginal).toBeCloseTo(5, 5);

    const oneTimeNode = snapshot.active.find((item) => item.uuid === "one-time");
    expect(oneTimeNode).toMatchObject({
      currencyCode: "CNY",
      remainingValueOriginal: 88,
      remainingMs: null,
      remainingRatio: 1,
    });

    const prepaidNode = snapshot.active.find((item) => item.uuid === "prepaid-quarter");
    expect(prepaidNode).toMatchObject({
      currencyCode: "USD",
      status: "active",
      remainingRatio: 3,
      remainingValueOriginal: 36,
      isLongTerm: false,
    });

    const longTermNode = snapshot.active.find((item) => item.uuid === "long-term-node");
    expect(longTermNode).toMatchObject({
      currencyCode: "USD",
      status: "active",
      remainingRatio: 1,
      remainingValueOriginal: 18,
      isLongTerm: true,
    });

    expect(snapshot.expired[0]).toMatchObject({
      uuid: "expired-node",
      currencyCode: "EUR",
      remainingValueOriginal: 0,
      status: "expired",
    });

    expect(snapshot.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uuid: "missing-price",
          skipReason: "missing_price",
        }),
        expect.objectContaining({
          uuid: "missing-expired-at",
          skipReason: "missing_expired_at",
        }),
      ]),
    );
  });
});
