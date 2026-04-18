import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VisitorInfoPanel from "@/components/VisitorInfoPanel";

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

describe("VisitorInfoPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 48;
      return now;
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    global.fetch = undefined as unknown as typeof fetch;
  });

  it("shows visitor info, auto-hides, and reopens from the compact button", async () => {
    const fetchMock = vi.fn()
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

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<VisitorInfoPanel />);

    expect(await screen.findByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("IP 地址")).toBeInTheDocument();
    expect(screen.getByText("地理位置")).toBeInTheDocument();
    expect(screen.getByText("运营商")).toBeInTheDocument();
    expect(screen.getByText("203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText(/Example Telecom/)).toBeInTheDocument();
    expect(screen.getByTestId("flag-JP")).toBeInTheDocument();

    const panel = screen.getByTestId("visitor-info-panel");
    const reopenButton = screen.getByRole("button", { name: "重新展开访客信息" });

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(panel).toHaveAttribute("data-state", "closed");
      expect(reopenButton).toHaveAttribute("data-state", "visible");
    });

    await user.click(reopenButton);

    expect(panel).toHaveAttribute("data-state", "open");
    expect(reopenButton).toHaveAttribute("data-state", "hidden");
  });

  it("keeps the shell visible and shows fallback copy when metadata fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(await screen.findByText("访客信息")).toBeInTheDocument();
    expect(screen.getByText("获取失败")).toBeInTheDocument();
    expect(screen.getAllByText("不可用").length).toBeGreaterThan(0);
  });

  it("shows latency fallback when ip info succeeds but latency checks fail", async () => {
    const fetchMock = vi.fn()
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

    expect(await screen.findByText("198.51.100.9")).toBeInTheDocument();
    expect(screen.getByText("不可用")).toBeInTheDocument();
    expect(screen.getByTestId("flag-SG")).toBeInTheDocument();
  });
});
