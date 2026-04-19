# Map And Visitor Polish Design

## Summary

This design refines two parts of Komari Nexus that already exist in the theme:

- the lower-left visitor info floating card
- the new global node distribution map view

The goal of this pass is visual cleanup rather than feature expansion. The visitor card should become easier to scan with long location text, and the map should become more elegant by removing visual clutter such as marker dots, counts, and leader lines.

## Goals

- Make long visitor location text readable without dropping important information
- Move the visitor country flag into the card title area
- Remove the extra operator label and present the operator value as the visual focus
- Keep the visitor card aligned and balanced on desktop and mobile
- Simplify the map to a country-coloring interaction model
- Preserve click-to-open region details from the map
- Keep visible labels introduced in this pass in Chinese where practical

## Non-Goals

- Changing the data source for visitor info
- Reworking the node detail drawer behavior
- Adding new map filters, clustering, or hover tooltips
- Redesigning the right-side region detail panel from scratch

## Visitor Card Design

### Title row

The title row will change from an icon plus title into:

- optional country flag
- `访客信息`
- latency badge on the right

If the visitor country code is unavailable, the existing activity-style icon can remain as a fallback.

### Content layout

The card keeps the current information density but changes the arrangement:

- one row for `IP 地址`
- one wider row for `地理位置`
- one bottom content block for the network provider string

The location value should be allowed to wrap to two lines. It should not be forced into a narrow single-line truncation area. This preserves useful city and country information for longer names.

### Provider block

The current explicit operator heading will be removed. Instead, the provider value itself becomes the content of a muted rounded panel:

- light gray background
- rounded corners
- centered text
- comfortable padding

This gives the bottom block a clearer visual role and aligns it better with the rest of the card.

### Text strategy

Labels in this component should use Chinese:

- `访客信息`
- `延迟`
- `IP 地址`
- `地理位置`
- fallback copy such as `获取失败` and `不可用`

Country and region names may stay in their resolved display language, which is currently English for many regions.

## Map Design

### Core interaction

The map should move to a cleaner interaction model:

- countries or regions with nodes are filled by status color
- clicking a colored country selects that region
- the right-side detail panel updates to show that region's nodes

This keeps the important behavior while removing decorative layers that make the map look busy.

### Removed elements

The following map overlays will be removed:

- circular markers
- node-count numbers inside markers
- leader lines and callouts

These elements currently compete with the country shapes and create readability issues for small countries and dense areas.

### Status colors

The existing color meaning remains:

- green for fully online
- orange for partially online
- red for fully offline

Hover and selected states should still provide a subtle visual emphasis through stroke and shadow treatment, but the base map should remain calm and card-like.

## Layout

The left map surface should remain visually dominant. The right-side detail panel should continue using a fixed internal scroll behavior rather than stretching the entire layout based on long node lists.

This pass does not introduce pagination. The current scrollable detail list remains the preferred solution.

## Error Handling

- Visitor card layout changes must continue to work when remote data is partially missing
- If no country code is available, the title should still render cleanly without a broken flag
- Map simplification must not remove the ability to select a region with active nodes

## Testing Strategy

Implementation should verify:

- visitor card still renders and auto-hide behavior still works
- long location text wraps cleanly and does not overflow the card
- provider block stays centered and visually aligned
- map still renders active country fills
- clicking a filled country still updates the right-side region detail panel
- build and existing tests still pass
