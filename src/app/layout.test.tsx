import type { ReactNode } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import RootLayout from "@/app/layout";

vi.mock("@/components/providers", () => ({
  Providers: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/NavBar", () => ({
  default: () => <div>nav</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div>footer</div>,
}));

vi.mock("@/components/VisitorInfoPanel", () => ({
  default: () => <div>visitor-panel</div>,
}));

vi.mock("@/components/RemainingValueCalculator", () => ({
  default: () => <button type="button" aria-label="剩余价值计算器" />,
}));

describe("RootLayout", () => {
  it("mounts the remaining value calculator globally", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>dashboard</div>
      </RootLayout>,
    );

    expect(markup).toContain('aria-label="剩余价值计算器"');
  });
});
