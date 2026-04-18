import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import VisitorInfoPanel from "@/components/VisitorInfoPanel";

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("VisitorInfoPanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 48;
      return now;
    });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("shows visitor info, auto-hides, and reopens from the compact button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "203.0.113.7",
          city: "Tokyo",
          country: "JP",
          org: "AS12345 Example Telecom",
        }),
      } as Response)
      .mockResolvedValue({ ok: true } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);
    await flushEffects();

    expect(screen.getByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("IP 地址")).toBeInTheDocument();
    expect(screen.getByText("地理位置")).toBeInTheDocument();
    expect(screen.getByText("运营商")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText(/Example Telecom/)).toBeInTheDocument();
    expect(screen.getAllByTestId("flag-JP")).toHaveLength(2);

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(panel).toHaveAttribute("data-state", "closed");
    expect(reopenButton).toHaveAttribute("data-state", "visible");

    await act(async () => {
      reopenButton.click();
    });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");
  });

  it("shows fallback copy and still auto-hides when metadata fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<VisitorInfoPanel />);
    await flushEffects();

    expect(screen.getByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("IP 地址")).toBeInTheDocument();
    expect(screen.getByText("地理位置")).toBeInTheDocument();
    expect(screen.getByText("运营商")).toBeInTheDocument();
    expect(screen.getByText("获取失败")).toBeInTheDocument();
    expect(screen.getAllByText("不可用")).toHaveLength(2);

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(panel).toHaveAttribute("data-state", "closed");
    expect(reopenButton).toHaveAttribute("data-state", "visible");
  });

  it("shows latency fallback when ip info succeeds but latency checks fail", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "198.51.100.9",
          city: "Singapore",
          country: "SG",
          org: "AS64500 Demo Net",
        }),
      } as Response)
      .mockRejectedValue(new Error("latency blocked"));

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);
    await flushEffects();

    expect(screen.getByText("198.51.100.9")).toBeInTheDocument();
    expect(screen.getByText(/Singapore/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Net/)).toBeInTheDocument();
    expect(screen.getByText("延迟 不可用")).toBeInTheDocument();
    expect(screen.getAllByTestId("flag-SG")).toHaveLength(2);

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(panel).toHaveAttribute("data-state", "closed");
    expect(reopenButton).toHaveAttribute("data-state", "visible");
  });
});
