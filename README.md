# Komari Nexus

Komari Nexus is a customized Komari theme based on [KomariNext](https://github.com/tonyliuzj/komari-next), focused on clearer global presentation and practical dashboard-side utilities.

[中文说明](https://github.com/piphase/komari-nexus/blob/main/README-CN.md)

[Repository](https://github.com/piphase/komari-nexus)

## Project Overview

Komari Nexus keeps the solid KomariNext foundation, but reshapes the theme around a more visual and utility-oriented experience.

This version is primarily aimed at users who want:

- a clearer global view of node distribution
- a practical way to estimate remaining node value
- lightweight visitor-side information directly on the page

## Based On KomariNext

Komari Nexus is a secondary development project built on top of [KomariNext](https://github.com/tonyliuzj/komari-next).

The upstream project provides the baseline Komari theme capabilities and overall technical foundation. This repository keeps that attribution explicit and continues to respect the original upstream project and license.

## What Komari Nexus Adds

### Global Distribution Module

Komari Nexus adds a dedicated global distribution view that lets users understand node placement at a glance.

Highlights:

- world map based node distribution
- country and region highlighting
- region-side node list for the selected area
- support for opening the existing node detail drawer from map-side interactions

![Komari Nexus Global Distribution](./images/komari-nexus-map-view.png)

### Remaining Value Calculator

Komari Nexus adds a remaining value calculator designed for practical day-to-day use.

Highlights:

- floating entry plus page-side entry button
- remaining value calculation for nodes with price and billing data
- default CNY display with exchange-rate conversion
- filtering between included, skipped, and expired nodes

![Komari Nexus Remaining Value Calculator](./images/komari-nexus-remaining-value.png)

### Visitor Information Floating Card

Komari Nexus adds a visitor information floating card in the lower-left corner of the page.

Highlights:

- visitor IP and basic geographic/network information
- delayed presentation after data is ready
- automatic collapse after display
- compact reopen button after auto-hide

![Komari Nexus Visitor Information Card](./images/komari-nexus-visitor-info.png)

## Original KomariNext Features

For the baseline theme features inherited from the upstream project, please refer to:

[KomariNext](https://github.com/tonyliuzj/komari-next)

This repository focuses on the custom additions and presentation direction specific to Komari Nexus, rather than duplicating the full upstream feature list.

## Installation / Usage

The recommended way to use Komari Nexus is:

1. Download the packaged theme from Releases
2. Upload the theme package through the Komari admin dashboard

If you prefer local development or manual packaging, you can build it yourself as described below.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the static theme output:

```bash
npm run build
```

When packaging the theme for Komari, make sure:

- `komari-theme.json` is at the root of the zip
- `preview.png` is at the root of the zip
- built site files are placed under `dist/`

## Acknowledgement And License

Komari Nexus is independently maintained, but it is based on the original [KomariNext](https://github.com/tonyliuzj/komari-next) project.

Please keep upstream attribution and licensing information intact when redistributing or modifying this project.
