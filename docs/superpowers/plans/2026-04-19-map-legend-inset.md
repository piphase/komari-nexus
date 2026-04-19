# Map Legend Inset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the global map legend back into the map frame while keeping it out of the main map viewing area.

**Architecture:** Revert the legend to live inside the map surface, then reserve a bottom inset area inside the same frame so the legend is visually integrated without blocking the SVG content. Keep the change local to the map component, stylesheet, and one structural test.

**Tech Stack:** React, Next.js, Vitest, Testing Library, CSS

---

### Task 1: Lock the desired structure in tests

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\NodeMapView.test.tsx`
- Test: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\NodeMapView.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
const mapSurface = container.querySelector(".node-map-view__surface");
const legend = container.querySelector(".node-map-view__legend");

expect(mapSurface).toBeInTheDocument();
expect(legend).toBeInTheDocument();
expect(mapSurface?.querySelector(".node-map-view__legend")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest -- run src/components/NodeMapView.test.tsx`
Expected: FAIL because the legend currently lives outside `.node-map-view__surface`

- [ ] **Step 3: Write minimal implementation**

```tsx
<div className="node-map-view__surface">
  <svg className="node-map-view__svg" />
  <div className="node-map-view__legend">...</div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest -- run src/components/NodeMapView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/NodeMapView.test.tsx src/components/NodeMapView.tsx
git commit -m "fix: restore map legend inside map frame"
```

### Task 2: Integrate the legend visually into the map frame

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\NodeMapView.tsx`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\NodeMapView.css`
- Test: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\NodeMapView.test.tsx`

- [ ] **Step 1: Write the failing style/structure expectation**

```tsx
expect(screen.getByText("鍏ㄩ儴鍦ㄧ嚎")).toBeInTheDocument();
expect(screen.getByText("鍏ㄩ儴绂荤嚎")).toBeInTheDocument();
expect(container.querySelector(".node-map-view__map-panel")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest -- run src/components/NodeMapView.test.tsx`
Expected: FAIL because `.node-map-view__map-panel` still exists

- [ ] **Step 3: Write minimal implementation**

```css
.node-map-view__surface {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
}

.node-map-view__legend {
  position: relative;
  margin: 0;
  border-top: 1px solid rgba(226, 232, 240, 0.84);
  border-radius: 0 0 1.75rem 1.75rem;
  box-shadow: none;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest -- run src/components/NodeMapView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/NodeMapView.tsx src/components/NodeMapView.css src/components/NodeMapView.test.tsx
git commit -m "style: integrate map legend as inset footer"
```

### Task 3: Regression verification and package build

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\specs\2026-04-19-map-legend-inset-design.md`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\plans\2026-04-19-map-legend-inset.md`

- [ ] **Step 1: Run focused regression tests**

```bash
npm exec vitest -- run src/components/NodeMapView.test.tsx src/components/NodeDisplay.test.tsx src/app/layout.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: PASS with only known export/rewrite warnings

- [ ] **Step 3: Package the theme**

```powershell
# Build clean zip with root komari-theme.json / preview.png and dist/* using forward slashes
```

Expected: zip root contains `komari-theme.json` and `preview.png`, all site files live under `dist/`, no nested zip inside `dist/`

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-19-map-legend-inset-design.md docs/superpowers/plans/2026-04-19-map-legend-inset.md
git commit -m "docs: add map legend inset plan"
```
