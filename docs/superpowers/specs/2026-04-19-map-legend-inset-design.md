# Map Legend Inset Design

## Summary

The global map legend should return to the same visual frame as the map, but it should no longer feel like a floating overlay that blocks the map.

The updated design will place the legend inside the map card as an inset bottom information bar. It remains visually attached to the map surface, while the map content gets a reserved bottom safe area so the legend does not sit on top of important country shapes.

## Goals

- Keep the legend inside the same map frame
- Avoid blocking the main map drawing area
- Make the legend feel integrated instead of split into a separate card
- Preserve the current legend content and mobile responsiveness

## Non-Goals

- No change to map data or country selection behavior
- No change to legend wording
- No new interactions or filters in the legend

## Layout

### Recommended approach

Use an inset bottom bar inside `.node-map-view__surface`.

Behavior:

- the legend sits at the bottom edge of the map frame
- the legend spans the inner width of the map frame
- the map SVG gets bottom padding or reduced drawable height so the legend occupies reserved space instead of covering the map body

### Visual treatment

The legend should look like part of the map card:

- lighter border and shadow than a standalone floating card
- same rounded language as the current map frame
- subtle translucent background is allowed, but should be less “hovering” than before

### Content

Keep the two existing legend blocks:

- `全部在线 / 部分在线 / 全部离线`
- `+N 个未显示地区`

## Implementation Notes

- `src/components/NodeMapView.tsx` should move the legend back inside `.node-map-view__surface`
- `src/components/NodeMapView.css` should remove the separate map-panel treatment
- the bottom inset area should be handled by layout, not by placing a free-floating chip over the map body

## Testing

Verify:

- the legend is again rendered inside `.node-map-view__surface`
- the legend still renders its current text content
- the detail panel and map interactions continue to work

## Scope Check

This is a small, single-area UI polish change. It fits one short implementation plan and does not need to be split further.
