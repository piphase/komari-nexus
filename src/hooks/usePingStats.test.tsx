import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePingStats } from "@/hooks/usePingStats";

const rpcCallMock = vi.fn();

vi.mock("@/contexts/RPC2Context", () => ({
  useRPC2Call: () => ({
    call: rpcCallMock,
  }),
}));

describe("usePingStats", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
  });

  it("does not fetch until enabled becomes true", async () => {
    rpcCallMock.mockResolvedValue({ records: [], tasks: [] });

    const { rerender } = renderHook(
      ({ enabled }) => usePingStats("node-1", 24, { enabled }),
      {
        initialProps: { enabled: false },
      },
    );

    expect(rpcCallMock).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(rpcCallMock).toHaveBeenCalledTimes(1);
    });

    expect(rpcCallMock).toHaveBeenCalledWith("common:getRecords", {
      uuid: "node-1",
      type: "ping",
      hours: 24,
    });
  });

  it("reuses cached stats for the same node and time range", async () => {
    rpcCallMock.mockResolvedValue({
      records: [{ client: "demo", task_id: 1, time: "2026-04-21T00:00:00Z", value: 1 }],
      tasks: [{ id: 1, name: "demo", interval: 60, loss: 2, p99_p50_ratio: 1.5 }],
    });

    const first = renderHook(() => usePingStats("node-cache", 24, { enabled: true }));

    await waitFor(() => {
      expect(first.result.current.hasData).toBe(true);
    });

    expect(rpcCallMock).toHaveBeenCalledTimes(1);

    first.unmount();

    const second = renderHook(() => usePingStats("node-cache", 24, { enabled: true }));

    await waitFor(() => {
      expect(second.result.current.avgLoss).toBe(2);
    });

    expect(rpcCallMock).toHaveBeenCalledTimes(1);
  });
});
