import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import CircleChart from "@/components/CircleChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBar: () => <div />,
  PolarAngleAxis: () => <div />,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    themeConfig: {
      colorTheme: "default",
    },
  }),
}));

describe("CircleChart", () => {
  it("uses a larger and thinner compact ring for table charts", () => {
    const { container } = render(<CircleChart value={33} label="CPU" compact />);

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(container.querySelector(".h-\\[76px\\].w-\\[76px\\]")).toBeTruthy();
  });
});
