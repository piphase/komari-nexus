# Map And Visitor Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Komari Nexus so the visitor info card handles long location text cleanly and the global map uses a simpler country-coloring interaction without markers or leader lines.

**Architecture:** Keep the existing `VisitorInfoPanel` and `NodeMapView` components, but simplify their rendering rules instead of rebuilding them. Update component-level tests first, then make the smallest code and CSS changes needed to satisfy the approved UI behavior while preserving the existing drawer, region selection, and build pipeline.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind utility classes, component-scoped CSS, Vitest, Testing Library

---

## File Structure

### Modify

- `src/components/VisitorInfoPanel.tsx`
  - Move the country flag into the title area
  - Let the location value wrap to two lines
  - Replace the labeled operator block with a centered muted content pill/card
- `src/components/VisitorInfoPanel.test.tsx`
  - Update expectations to match the new title, two-line location behavior, and simplified provider block
- `src/components/NodeMapView.tsx`
  - Remove marker-layer rendering and leader-line logic
  - Keep country fill, selection, legend, and right-side detail panel behavior
  - Replace any remaining user-facing English defaults in this view with Chinese where appropriate
- `src/components/NodeMapView.css`
  - Remove unused marker and leader-line styles
  - Slightly bias the layout toward the map surface and keep the right panel scrollable
- `src/components/NodeMapView.test.tsx`
  - Replace marker/callout assertions with assertions for the simplified clickable country-fill behavior

### Reference Only

- `docs/superpowers/specs/2026-04-19-map-and-visitor-polish-design.md`
- `src/components/Flag.tsx`
- `src/components/NodeDisplay.test.tsx`
- `src/components/NodeMapView.asset.test.ts`

---

### Task 1: Lock Down Visitor Card Polish with Failing Tests

**Files:**
- Modify: `src/components/VisitorInfoPanel.test.tsx`
- Reference: `src/components/VisitorInfoPanel.tsx`

- [ ] **Step 1: Update the visitor panel tests to describe the approved UI**

Edit `src/components/VisitorInfoPanel.test.tsx` so the success-path test verifies the new title structure and the provider block no longer depends on an `运营商` label:

```tsx
it("shows the country flag in the title, keeps long location text readable, auto-hides after success, and reopens from the compact button", async () => {
  vi.useFakeTimers();

  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => {
    now += 48;
    return now;
  });

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: "203.0.113.7",
        city: "Buenos Aires Autonomous City",
        country: "AR",
        org: "AS12345 Example Telecom",
      }),
    } as Response)
    .mockResolvedValue({ ok: true } as Response);

  global.fetch = fetchMock as unknown as typeof fetch;

  render(<VisitorInfoPanel />);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

  const panel = screen.getByTestId("visitor-info-panel");

  expect(within(panel).getByText("访客信息")).toBeInTheDocument();
  expect(within(panel).getByTestId("flag-AR")).toBeInTheDocument();
  expect(within(panel).getByText("IP 地址")).toBeInTheDocument();
  expect(within(panel).getByText("地理位置")).toBeInTheDocument();
  expect(within(panel).getByText("203.0.113.7")).toBeInTheDocument();
  expect(within(panel).getByText(/Buenos Aires Autonomous City/)).toBeInTheDocument();
  expect(within(panel).getByText(/Example Telecom/)).toBeInTheDocument();
  expect(within(panel).queryByText("运营商")).not.toBeInTheDocument();
});
```

Update the failure-path test so it still expects the shell to render, but no longer expects the removed provider title:

```tsx
it("keeps the panel visible and avoids auto-hide scheduling when metadata fails", async () => {
  const setTimeoutSpy = vi.spyOn(window, "setTimeout");
  global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

  render(<VisitorInfoPanel />);

  expect(await screen.findByText("获取失败")).toBeInTheDocument();
  expect(screen.getByText("访客信息")).toBeInTheDocument();
  expect(screen.getByText("IP 地址")).toBeInTheDocument();
  expect(screen.getByText("地理位置")).toBeInTheDocument();
  expect(screen.queryByText("运营商")).not.toBeInTheDocument();
  expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === 5000)).toBe(false);
});
```

- [ ] **Step 2: Run the focused visitor test file and confirm it fails on current UI text or structure**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx
```

Expected:

```text
FAIL  src/components/VisitorInfoPanel.test.tsx
TestingLibraryElementError: Unable to find an element with the text: 访客信息
```

- [ ] **Step 3: Commit the failing-test checkpoint**

Run:

```bash
git add src/components/VisitorInfoPanel.test.tsx
git commit -m "test: cover visitor card polish"
```

---

### Task 2: Implement Visitor Card Layout Cleanup

**Files:**
- Modify: `src/components/VisitorInfoPanel.tsx`
- Test: `src/components/VisitorInfoPanel.test.tsx`

- [ ] **Step 1: Update visible copy constants to clean Chinese strings**

In `src/components/VisitorInfoPanel.tsx`, replace the current mojibake text literals with explicit Chinese constants near the top of the file:

```tsx
const UNAVAILABLE = "不可用";
const FETCH_FAILED = "获取失败";
const PANEL_TITLE = "访客信息";
const LATENCY_LABEL = "延迟";
const IP_LABEL = "IP 地址";
const LOCATION_LABEL = "地理位置";
const REOPEN_LABEL = "重新展开访客信息";
```

Then wire those constants into `DEFAULT_STATE`, `buildLocation`, the header badge, row labels, and the reopen button `aria-label`.

- [ ] **Step 2: Move the flag into the title and allow location text to wrap**

Replace the card header and the location row in `src/components/VisitorInfoPanel.tsx` with the following structure:

```tsx
<div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
    {state.countryCode ? (
      <Flag flag={state.countryCode} size="5" />
    ) : (
      <Activity className="h-4 w-4 text-primary" />
    )}
    <span>{PANEL_TITLE}</span>
  </div>
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${latencyTone}`}>
    {LATENCY_LABEL} {state.latency}
  </span>
</div>

<div className="flex items-start justify-between gap-4">
  <div className="flex items-center gap-2 pt-0.5 text-muted-foreground">
    <MapPin className="h-4 w-4" />
    <span>{LOCATION_LABEL}</span>
  </div>
  <div className="max-w-[13.5rem] text-right text-foreground">
    <span className="line-clamp-2 break-words">{state.location}</span>
  </div>
</div>
```

This keeps the title cleaner and prevents long locations from collapsing into an unreadable single-line truncation.

- [ ] **Step 3: Replace the labeled operator block with a centered muted content card**

In the same file, replace the current operator block with:

```tsx
<div className="rounded-2xl bg-slate-100/85 px-4 py-3 text-center text-sm text-slate-700">
  <div className="break-words font-medium text-foreground">{state.organization}</div>
</div>
```

Also remove the unused `Wifi` import because the operator icon and label are no longer rendered.

- [ ] **Step 4: Run the visitor panel tests and verify they pass**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx
```

Expected:

```text
PASS  src/components/VisitorInfoPanel.test.tsx
4 passed
```

- [ ] **Step 5: Commit the visitor card implementation**

Run:

```bash
git add src/components/VisitorInfoPanel.tsx src/components/VisitorInfoPanel.test.tsx
git commit -m "feat: polish visitor info card layout"
```

---

### Task 3: Lock Down Map Simplification with Failing Tests

**Files:**
- Modify: `src/components/NodeMapView.test.tsx`
- Reference: `src/components/NodeMapView.tsx`
- Reference: `src/components/NodeMapView.css`

- [ ] **Step 1: Replace marker-specific assertions with simplified map expectations**

Update `src/components/NodeMapView.test.tsx` so the compact-country test asserts that Singapore is selectable by country fill alone and that no marker or leader-line DOM remains:

```tsx
it("keeps compact countries clickable without rendering markers or leader lines", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <NodeMapView
      nodes={compactRegionNodes}
      liveData={{ online: ["sg-core"], data: {} }}
    />
  );

  const singaporeCountry = container.querySelector('[data-country-code="SG"]');
  expect(singaporeCountry).toBeInTheDocument();
  expect(container.querySelector(".node-map-view__marker-layer")).not.toBeInTheDocument();
  expect(container.querySelector('[data-country-leader="SG"]')).not.toBeInTheDocument();

  await user.click(singaporeCountry as Element);

  expect(screen.getByText("Singapore")).toBeInTheDocument();
  expect(screen.getByText("该地区共 1 台节点")).toBeInTheDocument();
});
```

In the summary/detail test, switch the visible-text assertions to the cleaned Chinese strings:

```tsx
expect(screen.getByText("全球分布")).toBeInTheDocument();
expect(screen.getByText("2 个活跃国家/地区")).toBeInTheDocument();
expect(screen.getByText("全部在线")).toBeInTheDocument();
expect(screen.getByText("部分在线")).toBeInTheDocument();
expect(screen.getByText("全部离线")).toBeInTheDocument();
expect(screen.getByText("该地区共 2 台节点")).toBeInTheDocument();
expect(screen.getByText("节点数")).toBeInTheDocument();
```

- [ ] **Step 2: Run the map test file and confirm it fails on current marker output**

Run:

```bash
npm run test -- src/components/NodeMapView.test.tsx
```

Expected:

```text
FAIL  src/components/NodeMapView.test.tsx
Expected element not to be in the document, but it was found: .node-map-view__marker-layer
```

- [ ] **Step 3: Commit the failing-test checkpoint**

Run:

```bash
git add src/components/NodeMapView.test.tsx
git commit -m "test: cover simplified map presentation"
```

---

### Task 4: Remove Map Markers and Tighten the Layout

**Files:**
- Modify: `src/components/NodeMapView.tsx`
- Modify: `src/components/NodeMapView.css`
- Test: `src/components/NodeMapView.test.tsx`

- [ ] **Step 1: Remove marker calculation and marker-layer rendering from the component**

In `src/components/NodeMapView.tsx`, delete the marker-related constants and types:

```tsx
const ALWAYS_MARKER_CODES = new Set(["SG", "HK", "MO", "TW"]);
const CALLOUT_MARKERS = { ... };
const EXTERNAL_MARKER_OFFSETS = { ... };

type MarkerLayout = {
  type: "inline" | "external";
  strategy: "centroid" | "callout";
  marker: [number, number];
  leaderPath: string | null;
};
```

Then simplify the `countries` mapping so each country returns only:

```tsx
return {
  name,
  pathData,
  activeRegion,
};
```

Finally, remove the entire `<g className="node-map-view__marker-layer">...</g>` block from the SVG so only the country layer remains interactive.

- [ ] **Step 2: Clean up default copy and keep the region detail behavior intact**

In the same file, replace the remaining default values with approved Chinese strings:

```tsx
<CardTitle>{t("mapView.title", { defaultValue: "全球分布" })}</CardTitle>
```

```tsx
{t("mapView.activeCountries", {
  count: summary.regions.length,
  defaultValue: `${summary.regions.length} 个活跃国家/地区`,
})}
```

```tsx
defaultValue: `${summary.totalNodes} 台节点`
defaultValue: `${summary.onlineNodes} 台在线`
defaultValue: `${summary.offlineNodes} 台离线`
```

```tsx
aria-label="全球节点分布地图"
```

```tsx
? `${region.label}: ${region.total} 台节点，${region.online} 台在线，${region.offline} 台离线`
```

```tsx
<p className="text-sm text-slate-500">{`该地区共 ${selectedRegion.total} 台节点`}</p>
```

```tsx
<div className="text-xs uppercase tracking-[0.16em] text-slate-500">节点数</div>
```

Also keep the right-side node buttons wired to `onOpenNodeDetails?.(node.uuid)` exactly as they are now.

- [ ] **Step 3: Remove unused CSS for markers and slightly favor the map panel width**

In `src/components/NodeMapView.css`, delete these rule groups entirely because the DOM will no longer render them:

```css
.node-map-view__country-leader { ... }
.node-map-view__country-leader.status-online { ... }
.node-map-view__country-leader.status-partial { ... }
.node-map-view__country-leader.status-offline { ... }
.node-map-view__country-leader.is-selected { ... }
.node-map-view__country-marker { ... }
.node-map-view__country-marker circle { ... }
.node-map-view__country-marker text { ... }
.node-map-view__country-marker.status-online circle { ... }
.node-map-view__country-marker.status-partial circle { ... }
.node-map-view__country-marker.status-offline circle { ... }
.node-map-view__country-marker[data-marker-placement="external"] circle { ... }
.node-map-view__country-marker[data-marker-strategy="callout"] circle { ... }
.node-map-view__country-marker:hover circle,
.node-map-view__country-marker.is-selected circle { ... }
```

Then adjust the desktop layout split from:

```css
grid-template-columns: minmax(0, 2.1fr) minmax(280px, 0.78fr);
```

to:

```css
grid-template-columns: minmax(0, 2.35fr) minmax(260px, 0.72fr);
```

This gives the map a little more visual dominance while keeping the right-side panel usable.

- [ ] **Step 4: Run the focused map tests and verify they pass**

Run:

```bash
npm run test -- src/components/NodeMapView.test.tsx src/components/NodeMapView.asset.test.ts
```

Expected:

```text
PASS  src/components/NodeMapView.test.tsx
PASS  src/components/NodeMapView.asset.test.ts
```

- [ ] **Step 5: Commit the map simplification**

Run:

```bash
git add src/components/NodeMapView.tsx src/components/NodeMapView.css src/components/NodeMapView.test.tsx
git commit -m "feat: simplify global map presentation"
```

---

### Task 5: Final Verification

**Files:**
- Verify: `src/components/VisitorInfoPanel.tsx`
- Verify: `src/components/VisitorInfoPanel.test.tsx`
- Verify: `src/components/NodeMapView.tsx`
- Verify: `src/components/NodeMapView.css`
- Verify: `src/components/NodeMapView.test.tsx`

- [ ] **Step 1: Run the directly affected component tests together**

Run:

```bash
npm run test -- src/components/VisitorInfoPanel.test.tsx src/components/NodeMapView.test.tsx src/components/NodeMapView.asset.test.ts src/components/NodeDisplay.test.tsx
```

Expected:

```text
PASS  src/components/VisitorInfoPanel.test.tsx
PASS  src/components/NodeMapView.test.tsx
PASS  src/components/NodeMapView.asset.test.ts
PASS  src/components/NodeDisplay.test.tsx
```

- [ ] **Step 2: Run the full suite**

Run:

```bash
npm run test
```

Expected:

```text
PASS  all test files
```

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected:

```text
Compiled successfully
Generating static pages ... done
```

Warnings about `rewrites` together with `output: export` may still appear; they are existing warnings and are not blockers if the build succeeds.

- [ ] **Step 4: Commit the verification checkpoint**

Run:

```bash
git add src/components/VisitorInfoPanel.tsx src/components/VisitorInfoPanel.test.tsx src/components/NodeMapView.tsx src/components/NodeMapView.css src/components/NodeMapView.test.tsx
git commit -m "chore: finalize map and visitor polish"
```

---

## Self-Review

### Spec coverage

- Visitor title flag placement: covered by Task 2 Step 2
- Two-line readable location text: covered by Task 2 Step 2
- Provider block without label: covered by Task 2 Step 3
- Simpler pure-color map interaction: covered by Task 4 Step 1
- Preserve country click to right-side region details: covered by Task 3 Step 1 and Task 4 Step 2
- Chinese UI copy where practical: covered by Task 2 Step 1 and Task 4 Step 2
- Keep map visually dominant and right panel scrollable: covered by Task 4 Step 3

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain
- Each verification step includes an exact command and expected result
- Each code-changing step names the exact file and shows the intended code or concrete replacement

### Type consistency

- `VisitorInfoPanel` remains the component name throughout
- `NodeMapView` remains the map component name throughout
- Marker-layer removal consistently refers to `.node-map-view__marker-layer`
- Chinese copy strings are consistent across the plan: `访客信息`, `地理位置`, `全球分布`, `该地区共 X 台节点`
