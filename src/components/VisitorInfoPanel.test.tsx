import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import VisitorInfoPanel from "@/components/VisitorInfoPanel";

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

describe("VisitorInfoPanel", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("shows the country flag in the title, keeps long location text readable, auto-hides after success, and reopens from the compact button", async () => {
    vi.useFakeTimers();

    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 48;
      return now;
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "203.0.113.7",
          city: "Buenos Aires Autonomous City",
          country: "AR",
          org: "AS12345 Example Telecom",
        }),
      } as Response)
      .mockResolvedValue({ ok: true } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const panel = screen.getByTestId("visitor-info-panel");

    expect(within(panel).getByText("访客信息")).toBeInTheDocument();
    expect(within(panel).getByTestId("flag-AR")).toBeInTheDocument();
    expect(within(panel).getByText("IP 地址")).toBeInTheDocument();
    expect(within(panel).getByText("地理位置")).toBeInTheDocument();
    expect(within(panel).getByText("203.0.113.7")).toBeInTheDocument();
    expect(within(panel).getByText(/Buenos Aires Autonomous City/)).toBeInTheDocument();
    expect(within(panel).getByText(/Example Telecom/)).toBeInTheDocument();
    expect(within(panel).queryByText("运营商")).not.toBeInTheDocument();

    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(panel).toHaveAttribute("data-state", "closed");
    expect(reopenButton).toHaveAttribute("data-state", "visible");

    fireEvent.click(reopenButton);

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");
  }, 10000);

  it("keeps the panel visible and avoids auto-hide scheduling when metadata fails", async () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(await screen.findByText("获取失败")).toBeInTheDocument();
    expect(screen.getByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("IP 地址")).toBeInTheDocument();
    expect(screen.getByText("地理位置")).toBeInTheDocument();
    expect(screen.queryByText("运营商")).not.toBeInTheDocument();

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");
    expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === 5000)).toBe(false);
  });

  it("shows metadata even if latency probing stays pending", async () => {
    const pendingLatency = new Promise<Response>(() => {});
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
      .mockImplementation(() => pendingLatency);

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(await screen.findByText("198.51.100.9")).toBeInTheDocument();
    expect(screen.getByText(/Singapore/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Net/)).toBeInTheDocument();
    expect(screen.getByText("延迟 不可用")).toBeInTheDocument();

    const panel = screen.getByTestId("visitor-info-panel");
    expect(within(panel).getByTestId("flag-SG")).toBeInTheDocument();

    const [, infoInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, latencyInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(infoInit.signal).toBeInstanceOf(AbortSignal);
    expect(latencyInit.signal).toBe(infoInit.signal);
  });

  it("aborts in-flight requests on unmount", () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>(() => {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { unmount } = render(<VisitorInfoPanel />);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const signal = init.signal as AbortSignal;

    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
