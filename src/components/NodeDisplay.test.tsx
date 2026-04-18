import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("test harness", () => {
  it("renders dom assertions", () => {
    render(<button>hello</button>);
    expect(screen.getByRole("button", { name: "hello" })).toBeInTheDocument();
  });
});
