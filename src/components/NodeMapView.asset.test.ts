import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const mapAssetPath = path.resolve(currentDir, "../../public/assets/maps/world-card-map.svg");
const mapViewStylesPath = path.resolve(currentDir, "./NodeMapView.css");

describe("world-card-map.svg", () => {
  it("ships a recognizable world silhouette instead of a placeholder blob", () => {
    const svg = readFileSync(mapAssetPath, "utf8");

    expect(svg).toContain('id="continent-north-america"');
    expect(svg).toContain('id="continent-south-america"');
    expect(svg).toContain('id="continent-eurasia"');
    expect(svg).toContain('id="continent-africa"');
    expect(svg).toContain('id="continent-oceania"');
  });
});

describe("NodeMapView dark theme styles", () => {
  it("includes dedicated dark-mode styling for the map surface and overlays", () => {
    const css = readFileSync(mapViewStylesPath, "utf8");

    expect(css).toContain(".dark .node-map-view__surface");
    expect(css).toContain(".dark .node-map-view__ocean");
    expect(css).toContain(".dark .node-map-view__country.status-online");
    expect(css).toContain(".dark .node-map-view__country.status-partial");
    expect(css).toContain(".dark .node-map-view__country.status-offline");
    expect(css).toContain(".dark .node-map-view__legend-card");
    expect(css).toContain(".dark .node-map-view__detail-card");
  });

  it("keeps the dark-mode cards close to the neutral card palette instead of a blue-tinted panel", () => {
    const css = readFileSync(mapViewStylesPath, "utf8");

    expect(css).toContain("rgba(39, 39, 42, 0.96)");
    expect(css).toContain("rgba(24, 24, 27, 0.98)");
    expect(css).toContain("rgba(39, 39, 42, 0.82)");
    expect(css).toContain("rgba(39, 39, 42, 0.88)");
  });
});
