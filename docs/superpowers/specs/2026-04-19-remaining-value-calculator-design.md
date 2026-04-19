# Remaining Value Calculator Design

## Summary

Komari Nexus will add a new floating utility called `剩余价值计算器`.

This feature will live alongside the existing lower-left visitor info panel, but it will use a different interaction model:

- a persistent round button is shown at the lower-right corner
- the calculator does not auto-open on page load
- the panel opens only when the user clicks the button

The calculator estimates the remaining value of paid nodes using fields that already exist in the current node data:

- `price`
- `billing_cycle`
- `currency`
- `expired_at`

The first version will not consider remaining traffic value. It will focus only on time-based remaining value for periodic nodes plus full-value handling for one-time purchase nodes.

## Goals

- Add a right-side floating calculator entry that matches the existing floating tool style
- Let users manually open the panel from a calculator icon button
- Show a global remaining-value total in a user-selected display currency
- Show per-node remaining value details in a readable list
- Separate expired nodes from active nodes
- Fetch exchange rates online only when the panel is opened
- Cache exchange rates locally for a short period to reduce repeat requests
- Keep the feature fully client-side and compatible with the current theme packaging flow

## Non-Goals

- No backend API changes
- No automatic popup on refresh or page load
- No traffic-based remaining value calculation in this iteration
- No manual exchange-rate input UI in this iteration
- No editing of node billing data inside the calculator

## User Experience

### Entry and visibility

- A round calculator button is fixed at the lower-right corner.
- The button remains visible by default.
- Clicking the button opens the remaining value panel.
- Clicking again or using the close action collapses the panel back to the button.
- Unlike the visitor panel, this tool does not auto-open and does not auto-hide.

### Panel structure

The opened panel contains three main areas:

1. Header
2. Global summary
3. Node detail sections

### Header

The header should include:

- title: `剩余价值计算器`
- current display currency selector, default `CNY`
- exchange-rate refresh button
- exchange-rate update time

This area should clearly tell the user which currency is being used for the converted totals.

### Global summary

The summary area should show:

- global remaining value total
- counted node count
- skipped node count
- expired node count

This gives users an immediate answer without forcing them to read the full list.

### Node details

The main detail list should show active nodes that were successfully included in the calculation.

Each row should contain:

- node name
- original price and billing cycle
- remaining time
- original-currency remaining value
- converted remaining value in the selected display currency

The default sort order should be descending by converted remaining value.

### Expired nodes

Expired periodic nodes should be shown in a dedicated section instead of mixing them into the active list.

That section may be collapsible, but even if it is expanded, it should be visually separated and clearly labeled as expired content.

## Data Sources

The calculator will use only data already present in the client node list.

Required node fields:

- `name`
- `price`
- `billing_cycle`
- `currency`
- `expired_at`

No extra RPC call is required for the calculator itself. The feature reuses the node list already loaded by the dashboard context.

## Calculation Rules

### Inclusion rules

A node participates in calculation only when:

- `price` exists and is greater than zero
- `currency` exists and is non-empty
- the billing information is sufficient for one of the supported calculation modes

Nodes are skipped when required data is missing or invalid.

### Periodic nodes

Periodic nodes are defined as:

- `billing_cycle > 0`

For these nodes:

- cycle duration = `billing_cycle` days
- remaining duration = `expired_at - now`
- remaining value ratio = `max(remaining duration / cycle duration, 0)`
- remaining value = `price * remaining value ratio`

If `remaining duration <= 0`, the node is treated as expired instead of active.

### One-time purchase nodes

One-time purchase nodes are defined as:

- `billing_cycle === -1`

For these nodes:

- remaining value = `price`

This matches the agreed rule that one-time payment nodes keep their full paid value in the calculator.

### Expired nodes

Expired nodes are periodic nodes whose `expired_at` is in the past.

For these nodes:

- they do not contribute to the active global total
- they appear in the expired section
- their displayed remaining value is `0`

### Skipped nodes

Skipped nodes are nodes that cannot be safely calculated, such as:

- missing or zero price
- missing currency
- missing `expired_at` on a periodic node
- invalid date or unsupported billing data

The first version should count skipped nodes and expose the count in the summary area so users understand why the total may not cover every node.

## Currency Conversion

### Default display currency

- default currency is `CNY`

### User switching

The panel header should let the user switch the display currency.

The initial supported options should be limited and practical, for example:

- `CNY`
- `USD`
- `EUR`

The selected display currency affects:

- global total
- per-node converted remaining value
- sort order

### Conversion model

Each node should first be calculated in its original currency.

Only after the original remaining value is obtained should it be converted into the currently selected display currency. This keeps the math stable and avoids compounding errors when the display currency changes.

## Exchange Rate Strategy

### Fetch timing

Exchange rates are fetched when the user opens the calculator panel.

The dashboard should not request rates during initial page load.

### Cache strategy

Successful exchange-rate results should be cached in `localStorage`.

The cached payload should include:

- rate data
- fetch timestamp
- source metadata if available

Cache validity should initially be one hour.

### Refresh behavior

The header should include a manual refresh action.

When the user changes display currency, the panel should reuse the cached rates already in memory if they are still valid. It should not automatically trigger a new network request on every currency switch.

### Failure behavior

If the latest online rate request fails:

- use the most recent cached rates if available
- mark the rates as stale or not latest

If there is no usable cache:

- keep original-currency values visible in the detail list
- show a clear message that converted totals are temporarily unavailable

If a specific node currency has no matching exchange rate:

- do not silently hide the node
- show that converted value is unavailable for that node

## Architecture

### Component placement

The calculator should be implemented as a global client component mounted in the root layout, similar to the visitor info panel.

This keeps the feature available across dashboard states without coupling it to:

- map view
- card view
- list view
- node details drawer state

### Internal structure

A clean split is recommended:

- floating shell component for button and open-state UI
- pure calculation helpers for remaining-value logic
- exchange-rate helper for fetch, cache, and conversion
- presentation subcomponents for summary rows and node lists if needed

This keeps business rules testable without requiring full UI rendering for every case.

## Layout and Styling

The calculator should visually align with Komari Nexus and the visitor panel:

- rounded floating surface
- border and blur treatment consistent with current floating UI
- readable mobile-safe spacing
- internal scroll for long content

Desktop behavior:

- lower-right anchored panel
- medium-width floating card
- internal scroll when content grows

Mobile behavior:

- keep the lower-right trigger button
- opened content may shift to a drawer-like or taller sheet presentation if needed for readability

The feature should feel like a built-in utility, not a separate admin tool.

## Copy Guidance

Visible copy should remain simple Chinese.

Suggested labels:

- `剩余价值计算器`
- `全局剩余价值`
- `参与计算`
- `已跳过`
- `已过期`
- `汇率更新时间`
- `刷新汇率`
- `剩余时间`
- `原币种价值`
- `换算后价值`
- `当前暂无可计算节点`

## Error Handling

- Invalid dates must not crash the panel.
- Missing or malformed node billing fields must be treated as skipped data.
- Exchange-rate fetch failures must not block opening the panel.
- Cached stale rates must be clearly labeled instead of silently treated as fresh.
- The feature must continue to work when the user opens the panel repeatedly.

## Network Notes

The exchange-rate provider will be an external online service.

Because this workspace may require a proxy for non-mainland-China services, implementation should be done with that environment rule in mind:

- prefer compatibility with `http://127.0.0.1:10808` when external access is unstable

This note matters for implementation and verification, even though the feature itself is client-side.

## Testing Strategy

Implementation should verify:

- the lower-right calculator button renders globally
- the panel stays closed by default
- clicking the button opens the panel
- periodic-node remaining value math is correct
- one-time node remaining value equals the full price
- expired nodes are excluded from active totals and shown separately
- skipped nodes are counted correctly
- display-currency switching updates totals and list ordering
- cached rates are reused within the cache window
- failed rate fetches fall back to cached data when available
- the panel still renders when no conversion is available

## Open Implementation Notes

The main unresolved implementation choice is the specific exchange-rate provider. The design intentionally leaves the provider flexible as long as it supports:

- browser-side access
- multi-currency conversion coverage
- response data suitable for local caching
- acceptable reliability for the target user environment

Provider selection should happen during implementation planning rather than inside this design doc.
