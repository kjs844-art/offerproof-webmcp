---
name: Offroof Evidence Desk
colors:
  background: '#e9edf2'
  on-background: '#182033'
  surface: '#fffefa'
  surface-container: '#fbfcfe'
  on-surface: '#182033'
  on-surface-variant: '#5d6677'
  outline: '#9da9ba'
  outline-variant: '#cdd4df'
  primary: '#2452d1'
  on-primary: '#ffffff'
  primary-container: '#edf2ff'
  on-primary-container: '#173888'
  secondary: '#14745a'
  on-secondary: '#ffffff'
  secondary-container: '#e9f7f2'
  on-secondary-container: '#105b47'
  error: '#b43f33'
  on-error: '#ffffff'
  error-container: '#fff0ed'
  on-error-container: '#7d3027'
typography:
  display-lg:
    fontFamily: Georgia
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 66px
    letterSpacing: -0.06em
  headline-md:
    fontFamily: Georgia
    fontSize: 27px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.035em
  body-base:
    fontFamily: Segoe UI Variable
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  label-sm:
    fontFamily: Segoe UI Variable
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
    letterSpacing: 0.11em
rounded:
  sm: 0.75rem
  DEFAULT: 0.875rem
  md: 1rem
  lg: 1.375rem
  xl: 1.625rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 64px
---

# Offroof interface contract

## Product character

Offroof is a trust-critical job-offer evidence desk. It should feel like a well-kept case file: calm, precise, legible, and transparent rather than promotional. The page helps a person inspect evidence and decide what to verify next. It never presents a fraud or safety verdict.

## Experience principles

1. Keep the primary flow visible in one workspace: source text, observed signals, verification plan, official resources.
2. Separate observations, limited inferences, and limitations in every signal card.
3. Keep privacy and agent-change consent visible before the related action.
4. Show WebMCP activity as a supporting audit trail, not as a user task.
5. Preserve the complete manual flow when WebMCP is unavailable.
6. Switching Korean and English changes only the presentation layer; case identity, consent, evidence, checklist state, receipts, tool names, and schemas remain stable.

## Visual direction

- Background: blue-gray desk `#E9EDF2` with a faint document grid.
- Primary ink: editorial navy `#182033`.
- Muted text: document slate `#5D6677`.
- Interactive accent: cobalt `#2452D1`; vermilion `#B43F33` is reserved for evidence annotations and no-action stamps.
- Document surfaces: warm paper `#FFFEFA` and cool ledger `#FBFCFE`.
- Warning surface: ivory `#FFF8E8`, warning ink `#8B5E12`.
- Success surface: mint `#E9F7F2`, success ink `#14745A`.
- Borders: blue-gray `#CDD4DF`, with `#9DA9BA` for structural rules.
- Display font: a system serif stack; UI text remains Segoe UI, Pretendard, then system sans-serif.
- Machine identifiers: Cascadia Code or the platform monospace fallback.

The page uses a restrained blue web-glass approximation for navigation, page shells, and major workspace panels. Those surfaces combine translucent blue-white fills, cool borders, inner highlights, and backdrop blur; unsupported and reduced-transparency environments receive solid fills. Dense reading surfaces, warnings, source text, quotes, and receipts remain opaque for legibility. The shape system is consistent: 22-26 pixels for major shells, 16 pixels for inner cards, 12-14 pixels for controls, and full pills only for compact status labels.

## Layout

- Desktop uses a 5/12 source column and a 7/12 evidence column.
- The source panel remains sticky only while both columns fit.
- The introduction behaves as a compact case-file cover and keeps the real evidence desk near the first viewport.
- The progress index is a thin document register: source, signals, plan, resources.
- Signals form individually rounded evidence cards with a numbered annotation margin, preserving the ledger sequence while making each finding easier to scan.
- WebMCP receipts are displayed as ledger rows, and official resources as a bibliography rather than cards.
- Mobile collapses to one column, removes nested receipt scrolling, and keeps every action at least 44 pixels high.

## Interaction and accessibility

- Every action uses a native button, link, input, details, or form control.
- Forms use application validation and `noValidate` to avoid mixed browser behavior.
- Focus is always visible with a high-contrast blue outline.
- Textareas have a deliberate fixed work area and internal scrolling.
- Status changes use polite live regions.
- Reduced motion disables nonessential animation and smooth scrolling.
- Reduced transparency and unsupported backdrop filters use solid white surfaces.
- Forced-colors mode preserves borders, buttons, status dots, and focus affordances.
- Long case IDs, tool names, and URLs wrap without widening the page.

## WebMCP visibility

The header reports feature detection and the registered tool count. The activity section lists the six stable tool names and shows privacy-safe receipts. Tool results describe their visible UI effect and suggested next actions so an agent can recover without guessing. The first five tools all write either case state or a visible activity receipt, so their read-only annotations are false. Only receipt lookup is truly read-only because it does not create another receipt.
