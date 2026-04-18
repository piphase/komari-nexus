import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const mapAssetPath = path.resolve(currentDir, "../../public/assets/maps/world-card-map.svg");

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
