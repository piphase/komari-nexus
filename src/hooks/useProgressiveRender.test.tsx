import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useProgressiveRender } from "@/hooks/useProgressiveRender";

describe("useProgressiveRender", () => {
  it("shows the first 10 items immediately and then appends 10 more per batch", () => {
    vi.useFakeTimers();
    const items = Array.from({ length: 25 }, (_, index) => index);

    const { result } = renderHook(() =>
      useProgressiveRender(items, {
        enabled: true,
        initialCount: 10,
        batchSize: 10,
        batchDelayMs: 20,
      }),
    );

    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.remainingCount).toBe(15);

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.visibleItems).toHaveLength(20);
    expect(result.current.remainingCount).toBe(5);

    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.visibleItems).toHaveLength(25);
    expect(result.current.remainingCount).toBe(0);

    vi.useRealTimers();
  });

  it("stops the previous batch queue when the reset key changes", () => {
    vi.useFakeTimers();
    const items = Array.from({ length: 25 }, (_, index) => index);

    const { result, rerender } = renderHook(
      ({ currentItems, resetKey }) =>
        useProgressiveRender(currentItems, {
          enabled: true,
          initialCount: 10,
          batchSize: 10,
          batchDelayMs: 20,
          resetKey,
        }),
      {
        initialProps: {
          currentItems: items,
          resetKey: "grid:first",
        },
      },
    );

    expect(result.current.visibleItems).toHaveLength(10);

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.visibleItems).toHaveLength(20);

    rerender({
      currentItems: Array.from({ length: 8 }, (_, index) => index + 100),
      resetKey: "grid:second",
    });

    expect(result.current.visibleItems).toEqual([100, 101, 102, 103, 104, 105, 106, 107]);

    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(result.current.visibleItems).toEqual([100, 101, 102, 103, 104, 105, 106, 107]);
    expect(result.current.remainingCount).toBe(0);

    vi.useRealTimers();
  });

  it("cancels the previous queue when input changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ items }) =>
        useProgressiveRender(items, {
          enabled: true,
          initialCount: 10,
          batchSize: 10,
          batchDelayMs: 20,
        }),
      {
        initialProps: {
          items: Array.from({ length: 25 }, (_, index) => index),
        },
      },
    );

    expect(result.current.visibleItems).toHaveLength(10);

    rerender({
      items: Array.from({ length: 6 }, (_, index) => index + 100),
    });

    act(() => {
      vi.advanceTimersByTime(40);
    });

    expect(result.current.visibleItems).toEqual([100, 101, 102, 103, 104, 105]);
    expect(result.current.remainingCount).toBe(0);

    vi.useRealTimers();
  });

  it("keeps everything visible when only the item reference changes", () => {
    vi.useFakeTimers();

    const initialItems = Array.from({ length: 25 }, (_, index) => ({
      id: `node-${index + 1}`,
      cpu: index,
    }));

    const { result, rerender } = renderHook(
      ({ items, resetKey }) =>
        useProgressiveRender(items, {
          enabled: true,
          initialCount: 10,
          batchSize: 10,
          batchDelayMs: 20,
          resetKey,
        }),
      {
        initialProps: {
          items: initialItems,
          resetKey: "cards:node-1,node-2,node-3",
        },
      },
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.visibleItems).toHaveLength(25);
    expect(result.current.isComplete).toBe(true);

    rerender({
      items: initialItems.map((item) => ({
        ...item,
        cpu: item.cpu + 1,
      })),
      resetKey: "cards:node-1,node-2,node-3",
    });

    expect(result.current.visibleItems).toHaveLength(25);
    expect(result.current.remainingCount).toBe(0);

    vi.useRealTimers();
  });
});
