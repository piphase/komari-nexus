# Komari Nexus Branding And README Design

## Summary

This project will formally present itself as `Komari Nexus`, with the GitHub repository renamed to `komari-nexus` and the README rewritten as an independent project homepage.

The README should no longer read like a lightly modified fork page. Instead, it should establish `Komari Nexus` as its own theme project while clearly preserving attribution to `KomariNext` as the upstream base.

## Goals

- Use `Komari Nexus` consistently as the public-facing project name
- Rename the repository to `komari-nexus`
- Rewrite the README around the current identity of the project
- Clearly state that the project is based on `KomariNext`
- Focus the README on the three major custom additions:
  - global distribution module
  - remaining value calculator
  - visitor information floating card
- Keep the README accessible to non-technical users

## Non-Goals

- No change to licensing or upstream attribution model
- No attempt to fully document every inherited `KomariNext` feature
- No final screenshot layout yet, because feature screenshots will be added later

## Naming

### Public naming

- Project name: `Komari Nexus`
- Repository name: `komari-nexus`

### Upstream attribution

The README must explicitly state that:

- this project is based on `KomariNext`
- the upstream project link is preserved
- inherited baseline functionality can be referenced from the upstream project page

This wording should make the relationship clear without making `Komari Nexus` feel secondary or unofficial.

## README Strategy

### Recommended approach

Use the README as an independent project homepage with a short upstream attribution section.

This means:

- the README opens with `Komari Nexus`, not with fork framing
- the top summary explains what kind of Komari theme it is
- the main body focuses on what makes this version different
- upstream functionality is linked out instead of duplicated in detail

### Rejected alternatives

- **Light edit of the old README**
  - too weak for the new project identity
  - keeps too much old framing

- **Change log style README**
  - useful for patch notes, but weaker as a front page
  - not ideal for future users discovering the project for the first time

## README Structure

The new README should use this structure:

1. `# Komari Nexus`
2. short project introduction
3. `## Project Overview`
4. `## Based On KomariNext`
5. `## What Komari Nexus Adds`
6. `## Original KomariNext Features`
7. `## Installation / Usage`
8. `## Development`
9. `## Acknowledgement And License`

## Content Guidance

### Opening description

The opening should describe `Komari Nexus` as:

- a customized Komari theme
- based on `KomariNext`
- focused on clearer presentation and practical dashboard-side utilities

The tone should be concise and project-oriented, not overly promotional.

### Based On KomariNext

This section should:

- thank `KomariNext`
- link to the upstream repository
- explain that baseline Komari theme capabilities remain rooted in the upstream project

### What Komari Nexus Adds

This is the core section of the README and should be the main focus.

It should explain these three additions:

#### 1. Global distribution module

Describe:

- world map based node distribution
- country or region highlighting
- side panel node list for the selected region
- support for continuing into the existing node detail drawer

#### 2. Remaining value calculator

Describe:

- floating entry point and page entry point
- remaining value calculation for nodes with billing data
- CNY default display with exchange-rate conversion
- filtering between included, skipped, and expired nodes

#### 3. Visitor information floating card

Describe:

- lower-left floating card
- visitor IP and geographic/network information display
- delayed presentation after data is ready
- auto-collapse behavior and reopen button

### Original KomariNext Features

This section should be short.

It should say that for baseline theme capabilities and original feature scope, users can refer to the upstream `KomariNext` project page.

This avoids duplicating inherited documentation that is not unique to `Komari Nexus`.

### Installation / Usage

This section should prioritize the simplest user path:

- download the packaged theme from Releases
- upload it into Komari as a theme package

Optionally include a short development path below that for contributors.

### Development

Keep this short and practical:

- install dependencies
- run local development
- build the project
- package according to Komari theme requirements

This section should remain secondary to the project overview and feature description.

## Screenshot Plan

The README should be written now in a way that allows three screenshots to be inserted later without restructuring the page.

Reserved screenshot targets:

- global distribution module
- remaining value calculator
- visitor information floating card

For now, use text structure that can easily accept image blocks under each feature subsection later.

## Related File Updates

Implementation should likely update:

- `README.md`
- `README-CN.md`
- `komari-theme.json`
- any project-facing metadata or footer links if the repository name changes

The repository rename itself will happen on GitHub, but local links and visible repository references should be updated in the codebase.

## Testing / Verification

Implementation should verify:

- public repository links point to `piphase/komari-nexus` after the rename
- theme metadata remains consistent with `Komari Nexus`
- any metadata tests referencing repository URLs are updated
- README no longer presents the project as a generic fork page

## Scope Check

This is a single documentation and branding task. It is focused enough for one implementation plan and one implementation pass.
