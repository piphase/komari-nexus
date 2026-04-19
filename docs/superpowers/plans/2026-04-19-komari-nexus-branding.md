# Komari Nexus Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the project presentation to Komari Nexus end-to-end and replace the old fork-style README with an independent project homepage.

**Architecture:** First update repository-facing metadata and link expectations to the new `piphase/komari-nexus` identity, then rewrite both README files around the confirmed project structure, and finally verify that metadata tests and visible repository references stay consistent. The repository rename itself happens on GitHub, while codebase references are updated locally.

**Tech Stack:** Markdown, JSON metadata, React footer links, Vitest, GitHub repository links

---

### File Map

**Primary files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\README.md`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\README-CN.md`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\komari-theme.json`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\Footer.tsx`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\themeMetadata.test.ts`

**Support files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\specs\2026-04-19-komari-nexus-branding-design.md`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\plans\2026-04-19-komari-nexus-branding.md`

---

### Task 1: Update repository identity references

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\komari-theme.json`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\components\Footer.tsx`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\src\themeMetadata.test.ts`

- [ ] **Step 1: Write the failing metadata test**

```ts
expect(metadata.name).toBe("Komari Nexus");
expect(metadata.short).toBe("nexus");
expect(metadata.url).toBe("https://github.com/piphase/komari-nexus");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest -- run src/themeMetadata.test.ts`
Expected: FAIL because the repository URL still points to the old repository name

- [ ] **Step 3: Write minimal implementation**

```json
{
  "name": "Komari Nexus",
  "short": "nexus",
  "author": "piphase",
  "url": "https://github.com/piphase/komari-nexus"
}
```

```tsx
<a href="https://github.com/piphase/komari-nexus" ...>
  <span className="font-medium">Komari Nexus</span>
</a>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm exec vitest -- run src/themeMetadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add komari-theme.json src/components/Footer.tsx src/themeMetadata.test.ts
git commit -m "chore: align metadata with komari nexus repository"
```

### Task 2: Rewrite the English README as an independent project homepage

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\README.md`

- [ ] **Step 1: Write the failing text expectation**

```text
README.md must contain:
- # Komari Nexus
- ## Project Overview
- ## Based On KomariNext
- ## What Komari Nexus Adds
- ## Original KomariNext Features
- https://github.com/piphase/komari-nexus
```

- [ ] **Step 2: Run verification to confirm the current README does not match**

Run: `Get-Content README.md`
Expected: current README still follows the older fork-style layout and lacks the final rewritten structure

- [ ] **Step 3: Write minimal implementation**

```md
# Komari Nexus

Komari Nexus is a customized Komari theme based on KomariNext, focused on clearer global presentation and practical dashboard-side utilities.

## Project Overview

...

## Based On KomariNext

...

## What Komari Nexus Adds

### Global Distribution Module
...

### Remaining Value Calculator
...

### Visitor Information Floating Card
...

## Original KomariNext Features

For original baseline capabilities, please refer to the upstream KomariNext project:
https://github.com/tonyliuzj/komari-next
```

- [ ] **Step 4: Run verification to confirm the new structure is present**

Run: `Get-Content README.md`
Expected: the new title, section structure, and `piphase/komari-nexus` repository link are present

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: rewrite english readme for komari nexus"
```

### Task 3: Rewrite the Chinese README around the same structure

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\README-CN.md`

- [ ] **Step 1: Write the failing text expectation**

```text
README-CN.md must contain:
- # Komari Nexus
- ## 项目说明
- ## 基于 KomariNext
- ## Komari Nexus 新增功能
- ## 原项目功能
- https://github.com/piphase/komari-nexus
```

- [ ] **Step 2: Run verification to confirm it fails the intended structure**

Run: `Get-Content README-CN.md`
Expected: current Chinese README does not yet use the new independent-project structure

- [ ] **Step 3: Write minimal implementation**

```md
# Komari Nexus

## 项目说明

Komari Nexus 是一个基于 KomariNext 深度定制的 Komari 主题。

## 基于 KomariNext

...

## Komari Nexus 新增功能

### 全球分布模块
...

### 剩余价值计算器
...

### 访客信息浮动卡片
...
```

- [ ] **Step 4: Run verification to confirm the new structure is present**

Run: `Get-Content README-CN.md`
Expected: the new Chinese sections and `piphase/komari-nexus` repository link are present

- [ ] **Step 5: Commit**

```bash
git add README-CN.md
git commit -m "docs: rewrite chinese readme for komari nexus"
```

### Task 4: Final branding verification

**Files:**
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\specs\2026-04-19-komari-nexus-branding-design.md`
- Modify: `E:\project\my_komari\research2_komari_next\.worktrees\komarinext-classic-map-details\docs\superpowers\plans\2026-04-19-komari-nexus-branding.md`

- [ ] **Step 1: Run focused verification tests**

```bash
npm exec vitest -- run src/themeMetadata.test.ts src/app/layout.test.tsx
```

Expected: PASS

- [ ] **Step 2: Search for stale repository references**

```powershell
Get-ChildItem . -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.next\\|\\dist\\' } |
  Select-String -Pattern 'strayplace/komari-next|piphase/komari-next'
```

Expected: no stale public repository references remain after the repository rename work

- [ ] **Step 3: Check git status**

```bash
git status --short
```

Expected: only intended branding and README files are changed

- [ ] **Step 4: Commit**

```bash
git add README.md README-CN.md komari-theme.json src/components/Footer.tsx src/themeMetadata.test.ts docs/superpowers/specs/2026-04-19-komari-nexus-branding-design.md docs/superpowers/plans/2026-04-19-komari-nexus-branding.md
git commit -m "docs: finalize komari nexus branding"
```
