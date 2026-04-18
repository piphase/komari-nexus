# Visitor Info Panel Design

## Summary

Komari Nexus will add a built-in visitor information floating panel that replaces the current head-injected custom JavaScript snippet. The panel will be mounted as part of the theme itself, use the existing client-side React architecture, and preserve the current behavior pattern: slide in from the lower-left corner on page load, auto-hide after a short delay, and re-open from a compact button.

This feature is intended to surface visitor-side network information, not node information. The panel title and content will therefore use explicit Chinese labels to reduce ambiguity for end users.

## Goals

- Integrate the existing visitor IP panel into the theme codebase as a first-class feature
- Preserve the familiar lower-left slide-in and auto-hide interaction on desktop and mobile
- Use clear Chinese copy such as `访客信息`, `IP 地址`, `地理位置`, `运营商`, and `延迟`
- Fetch visitor IP metadata from `ipinfo.io`
- Measure latency using Google's `generate_204` endpoint
- Keep the panel visible even when one or more remote requests fail
- Avoid disrupting the existing dashboard, map view, drawer details, and theme layout behavior

## Non-Goals

- Adding a user-facing toggle to disable the panel
- Supporting multiple IP metadata providers in this iteration
- Caching visitor data between page refreshes
- Reusing the original injected script as-is
- Adding new backend APIs for visitor info

## User Experience

### Entry and visibility

- The panel appears automatically after page load.
- It slides in from the lower-left corner.
- After a short delay, it auto-hides and leaves behind a compact reopen button.
- Clicking the compact button reopens the panel.
- Hovering over the expanded panel pauses the auto-hide timer.
- Mobile keeps the same interaction model rather than switching to a separate layout pattern.

### Content

The panel displays:

- Title: `访客信息`
- Latency badge: `延迟`
- Row: `IP 地址`
- Row: `地理位置`
- Bottom info block: `运营商`

The previous `ISP / ASN` standalone row will be removed because the provider string already includes that information when available.

### Failure behavior

- If the IP metadata request fails, the panel still renders.
- Failed fields show a Chinese fallback such as `获取失败` or `不可用`.
- If only latency measurement fails, the latency badge falls back to `不可用` while the rest of the panel still uses any successfully fetched IP metadata.
- The panel should never break or block the page if external services are unavailable.

## Architecture

### Component placement

A new client component `VisitorInfoPanel` will be added to the theme and mounted in the global layout so it is available across the application. The component should live alongside the existing UI components and render near the end of the root layout tree so it can float above page content without depending on individual pages.

This placement keeps the feature global and avoids coupling it to a specific dashboard subview such as the node grid or map.

### Internal responsibilities

`VisitorInfoPanel` should own:

- Fetching visitor metadata from `ipinfo.io`
- Measuring latency against the configured Google endpoint
- Managing open and closed UI state
- Running and pausing the auto-hide timer
- Rendering fallback content when requests fail

The component should not depend on node list data, live monitor data, or drawer state.

## Data Flow

### Visitor metadata request

On mount, the component performs a client-side request to:

- `https://ipinfo.io/json`

Expected fields used by the UI:

- `ip`
- `city`
- `country`
- `org`

No local caching will be added. Each page refresh triggers a fresh request.

### Latency request

After or alongside the metadata fetch, the component measures latency against:

- `https://www.google.com/generate_204`

The current behavior should be preserved in principle:

- perform a warm-up request
- run multiple samples
- drop the worst outlier when more than one sample succeeds
- display the rounded average in milliseconds

If all latency samples fail, the UI shows `不可用`.

## Rendering Rules

### Text and labels

All visible copy introduced by this feature will use Chinese:

- `访客信息`
- `延迟`
- `IP 地址`
- `地理位置`
- `运营商`
- `获取失败`
- `不可用`

Country and region names returned by the remote data may remain in their resolved display form.

### Flag rendering

The panel should prefer theme-native flag rendering rather than a runtime CSS dependency on an external flag icon package. If the visitor country code can be resolved cleanly, the panel should use the existing local flag asset approach already present in the theme. If no reliable flag can be resolved, the UI should gracefully fall back to text-only rendering without leaving broken icons or placeholder glyph issues.

### Styling direction

The panel should visually stay close to the existing Komari Nexus direction:

- card-based floating surface
- soft translucency and blur where appropriate
- clean typography
- compatible with light and dark themes
- compact enough for mobile, but still readable

The feature should feel like part of the theme rather than an injected overlay from outside the project.

## Error Handling

- Network errors, non-OK responses, JSON parsing failures, and latency fetch failures must all be handled inside the component.
- Failure states should degrade content only, not the component shell.
- Timers must be cleaned up on unmount.
- Reopen and auto-hide behavior must continue to work even if all remote data fails.

## Testing Strategy

At implementation time, coverage should include:

- component renders without crashing
- successful data path shows expected Chinese labels
- failed metadata path still renders the panel shell with fallback copy
- failed latency path preserves the rest of the content
- auto-hide and reopen behavior operate as expected
- no regression to existing build and test commands

## Rollout Notes

- This feature will replace the need for the current custom head-injected script in normal usage.
- The initial implementation will be default-on with no settings toggle.
- Provider abstraction can be considered later if the user wants to move away from `ipinfo.io`.
