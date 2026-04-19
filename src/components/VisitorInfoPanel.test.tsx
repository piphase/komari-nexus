import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import VisitorInfoPanel from "@/components/VisitorInfoPanel";

const CONSENT_KEY = "visitorInfoConsentV1";

vi.mock("@/components/Flag", () => ({
  default: ({ flag }: { flag: string }) => <span data-testid={`flag-${flag}`} />,
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("VisitorInfoPanel", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it("requires explicit consent before starting third-party visitor lookups", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("visitor-info-toggle")).toHaveAttribute("data-state", "visible");

    fireEvent.click(screen.getByTestId("visitor-info-toggle"));

    expect(screen.getByTestId("visitor-info-consent")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("visitor-info-consent-accept"));

    expect(localStorage.getItem(CONSENT_KEY)).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits until latency is ready, then animates in before auto-hiding and reopening from the compact button", async () => {
    vi.useFakeTimers();
    localStorage.setItem(CONSENT_KEY, "true");

    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 48;
      return now;
    });

    const metadataRequest = createDeferred<Response>();
    const latencyRequest = createDeferred<Response>();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => metadataRequest.promise)
      .mockImplementation(() => latencyRequest.promise);

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    expect(screen.queryByTestId("visitor-info-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visitor-info-toggle")).not.toBeInTheDocument();

    metadataRequest.resolve({
      ok: true,
      json: async () => ({
        ip: "203.0.113.7",
        city: "Buenos Aires Autonomous City",
        country: "AR",
        org: "AS12345 Example Telecom",
      }),
    } as Response);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByTestId("visitor-info-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visitor-info-toggle")).not.toBeInTheDocument();

    latencyRequest.resolve({ ok: true } as Response);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const panel = screen.getByTestId("visitor-info-panel");
    expect(panel).toHaveAttribute("data-state", "closed");
    expect(panel).toHaveClass("z-50");
    expect(screen.getByTestId("visitor-info-toggle")).toHaveAttribute("data-state", "hidden");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(32);
    });

    expect(within(panel).getByTestId("flag-AR")).toBeInTheDocument();
    expect(within(panel).getByText("203.0.113.7")).toHaveClass("text-sm");
    expect(within(panel).getByText(/Buenos Aires Autonomous City/)).toBeInTheDocument();
    expect(within(panel).getByText(/Example Telecom/)).toBeInTheDocument();

    const reopenButton = screen.getByTestId("visitor-info-toggle");

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

  it("stays hidden and avoids auto-hide scheduling when metadata fails", async () => {
    localStorage.setItem(CONSENT_KEY, "true");
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(<VisitorInfoPanel />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId("visitor-info-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visitor-info-toggle")).not.toBeInTheDocument();
    expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === 5000)).toBe(false);
  });

  it("opens with unavailable latency after probing times out", async () => {
    vi.useFakeTimers();
    localStorage.setItem(CONSENT_KEY, "true");

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

    expect(screen.queryByTestId("visitor-info-panel")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
      await Promise.resolve();
    });

    const panel = screen.getByTestId("visitor-info-panel");
    expect(panel).toHaveAttribute("data-state", "closed");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(32);
    });

    expect(panel).toHaveAttribute("data-state", "open");

    expect(within(panel).getByTestId("flag-SG")).toBeInTheDocument();
    expect(screen.getByText("198.51.100.9")).toBeInTheDocument();
    expect(screen.getByText(/Singapore/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Net/)).toBeInTheDocument();

    const [, infoInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [latencyUrl, latencyInit] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(infoInit.signal).toBeInstanceOf(AbortSignal);
    expect(latencyInit.signal).toBe(infoInit.signal);
    expect(latencyUrl).toContain("cloudflare");
  }, 10000);

  it("aborts in-flight requests on unmount", () => {
    localStorage.setItem(CONSENT_KEY, "true");
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
