import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const themeMetadataPath = path.resolve(currentDir, "../komari-theme.json");

describe("komari-theme.json", () => {
  it("exposes the Komari Nexus theme identity", () => {
    const metadata = JSON.parse(readFileSync(themeMetadataPath, "utf8")) as {
      name: string;
      short: string;
      url: string;
    };

    expect(metadata.name).toBe("Komari Nexus");
    expect(metadata.short).toBe("nexus");
    expect(metadata.url).toBe("https://github.com/piphase/komari-next");
  });
});
