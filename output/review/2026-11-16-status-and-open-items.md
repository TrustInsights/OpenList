# Status record: OpenList foundation, popup redesign, and copy feature

Date: 2026-11-16
Result: all work in both implementation plans is built, reviewed, and passing the gate. Nothing is committed.

## What is done

- **Plan A (docs/superpowers/plans/2026-11-16-openlist-foundation.md), 12 tasks:** git hygiene and folder layout, all tests moved to `tests/`, the audit defects fixed (bare domains, context-menu API, start time, lifecycle errors, metric write queue, recorded errors), tighter gates (type-checking build, size-limit, audit, Knip production), dependency updates (zod 4, Vite 8, Vitest 5), dead code removed, documents refreshed, style guards added.
- **Plan B (docs/superpowers/plans/2026-11-16-openlist-popup-copy.md), 15 tasks:** design tokens with a contrast test, URL extractor, ten formats, tab sources, open planner, Details totals in local storage, optional clipboard permission, popup hooks and components, copy without the popup (shortcut and toolbar item through an offscreen page), end-to-end tests in real Chrome with axe, accessibility record and store notes, version 1.2.0.
- **Gate on 2026-11-16 (my own run):** `pnpm check` passes (Biome, tsc, Vitest at 100% coverage, Knip, audit, build, size-limit). Playwright in real Chromium: 67 passed.
- **Git state:** HEAD is still b943aac. Every change is staged except `graphify-out/`, and none is committed, because you have not approved commits. I left `graphify-out/` untracked on purpose: it holds about 56,000 lines of generated graph data. Decide whether to track it or add it to `.gitignore`.

## Choices the lead made without the owner (you can reverse each one)

| Choice | Where it is recorded |
|--------|----------------------|
| Search index: the OpenList-only index in `temp/qmd-home` is permanent (ruling 12, option c) | docs/project-decisions.md, CLAUDE.md "Project notes" |
| Open upgrades http to https for websites, but leaves localhost, 127.0.0.1, [::1], and .local addresses as typed (Decision 17, option A) | docs/project-decisions.md, spec section 6.1, README |
| The 13 calls in section 0 of the design document | docs/superpowers/specs/2026-11-16-openlist-popup-copy-design.md |

## What is left (needs the owner)

1. **Approve commits.** Say when to commit. Do not push until you say so.
2. **Manual accessibility pass.** An agent cannot do these. They are marked NOT DONE or UNVERIFIED in docs/accessibility.md: VoiceOver, real Windows forced colors, real browser zoom, the real optional-permission prompt for clipboard detection, `selectionText` newlines, and which window `getCurrent()` returns in the service worker. Until then the extension must not be called WCAG 2.1 AA compliant.
3. **Fixed on 2026-11-17** (owner rule: fix every known gap): the round trip for "Title & URL" and "Link" (ruling 33), the toolbar hint time (ruling 36), clipboard site-like lines (ruling 34), the right-click path (ruling 35), and the missing focus, hover, and reduced-motion tests. See docs/project-decisions.md rulings 33 to 37.

6. **The search journal.** The first research agent mis-filed 47 annotation rows. Only the journal's administrator can fix them.
7. **Outside the project root.** pnpm wrote a cache to ~/Library/Caches/pnpm early on, and the first workflow wrote npm cache paths under ~/.npm. The CHANGELOG lists the two paths. Delete them when you want. Nothing else was written outside the root. The one /tmp file was deleted with your permission.
8. **Real-Chrome checks no test can prove:** the offscreen clipboard write without focus, whether it needs `clipboardWrite`, and whether the shortcut Alt+Shift+C clashes on your machines.

## Usage

Weekly usage was 41% at the end of this run. The 5-minute monitor is stopped.
