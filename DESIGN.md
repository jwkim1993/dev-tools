<design-context>
---
version: alpha
name: Microsoft Fluent
description: "Enterprise-grade Fluent Design built on layered Acrylic and Mica materials, where translucency conveys depth and Microsoft Blue (#0078D4) anchors every primary action. Segoe UI carries a calm, productive density across Windows, Office, and Azure surfaces — clarity over decoration."

colors:
  primary: "#0078D4"
  on-primary: "#FFFFFF"
  primary-hover: "#106EBE"
  primary-pressed: "#005A9E"
  ink: "#201F1E"
  ink-muted: "#605E5C"
  ink-subdued: "#A19F9D"
  canvas: "#FAF9F8"
  surface-1: "#FFFFFF"
  surface-2: "#F3F2F1"
  surface-3: "#EDEBE9"
  border: "#E1DFDD"
  border-strong: "#8A8886"
  acrylic-overlay: "rgba(255,255,255,0.6)"
  success: "#107C10"
  warning: "#FFB900"
  danger: "#D13438"

typography:
  display:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  heading:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0em
  body:
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  mono:
    fontFamily: "Cascadia Code, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em

spacing:
  base: 4px
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]

radius:
  sm: 2px
  md: 4px
  lg: 8px
  pill: 9999px

shadows:
  card: "0 1.6px 3.6px rgba(0,0,0,0.13), 0 0.3px 0.9px rgba(0,0,0,0.11)"
  elevated: "0 6.4px 14.4px rgba(0,0,0,0.13), 0 1.2px 3.6px rgba(0,0,0,0.11)"
  flyout: "0 25.6px 57.6px rgba(0,0,0,0.22), 0 4.8px 14.4px rgba(0,0,0,0.18)"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  easing: cubic-bezier(0.1, 0.9, 0.2, 1)
---

## Rationale

**Materials are the differentiator, not flat color** — Fluent's defining move is treating the interface as physical layers of frosted glass. Acrylic (a blurred, translucent in-app material) and Mica (an opaque desktop material that samples the user's wallpaper) give the system depth without skeuomorphism. A command bar rendered in Acrylic tells you there is content behind it; a window background painted in Mica subtly ties the app to the desktop. This translucency is the brand — it is what makes a Fluent surface feel unmistakably "Microsoft" even before any blue appears.

**Microsoft Blue earns the primary action** — #0078D4 is reserved for the single most important action in any view: the primary button, the active navigation indicator, the selected toggle, the hyperlink. Across Office, Teams, Windows Settings, and Azure, that blue is the through-line that says "this is the thing to click." Headings, body text, and chrome stay neutral grey so the blue never competes with itself. Restraint here is what keeps a 200-control Azure portal navigable.

**Productivity density over generous whitespace** — Fluent is built for people who live in their tools eight hours a day: spreadsheets, dashboards, ticket queues, resource graphs. The 14px body size, 4px base grid, and 32px command-bar height pack genuine information density while staying click-safe. This is not a marketing site that needs to breathe; it is a cockpit that needs to show everything at once. The spacing scale is tight on purpose.

**Light-first, but theme-aware to the core** — Unlike security or media products that default dark, Fluent's home is the bright, neutral #FAF9F8 canvas of a productivity desktop. But every token is paired with a dark-theme and high-contrast counterpart, because Windows ships a system-wide high-contrast mode that the design system must honor by law and by habit. Color is always defined as a semantic token, never a raw hex in a component, so the entire surface can re-theme instantly.

## 1. Visual Theme & Atmosphere
Fluent feels like clean, well-lit office glass. The neutral canvas (#FAF9F8 — a barely-warm off-white, never stark #FFFFFF for full pages) reduces glare during long work sessions, while cards and dialogs sit on pure #FFFFFF surfaces to read as "lifted." Depth is communicated through layered materials and soft, low-spread shadows rather than heavy borders — a flyout menu hovers over the canvas on a diffuse shadow, its background a blurred Acrylic that lets the content beneath bleed through faintly.

The signature atmospheric element is light. Fluent's "Reveal" highlight follows the cursor across grouped controls, illuminating borders as the pointer approaches — a literal interpretation of light playing across glass. Combined with Mica sampling the desktop wallpaper into title bars, the system feels connected to its environment rather than sealed off from it.

## 2. Color System
**Neutral foundation**:
- Canvas: #FAF9F8 — warm-neutral page background, reduces glare
- Surface 1: #FFFFFF — cards, dialogs, content panes
- Surface 2: #F3F2F1 — secondary panels, hover fills, input backgrounds
- Surface 3: #EDEBE9 — pressed states, nav rail backgrounds
- Border: #E1DFDD — default control and divider color
- Border strong: #8A8886 — input outlines, focused field edges

**Brand action**:
- Microsoft Blue: #0078D4 — primary buttons, links, selected indicators
- Hover: #106EBE — slightly deeper on pointer over
- Pressed: #005A9E — darkest, confirms commit

**Text**:
- Primary ink: #201F1E — near-black neutral for body and headings
- Muted: #605E5C — secondary labels, metadata, placeholder-adjacent text
- Subdued: #A19F9D — disabled text, tertiary hints

**Semantic**:
- Success: #107C10 — completed operations, healthy resource status
- Warning: #FFB900 — attention required, pending states
- Danger: #D13438 — errors, destructive confirmation, failed deployments

Microsoft Blue is never used as a large background fill behind body text, nor as a heading color — it stays bound to interactive affordances so its presence always means "actionable."

## 3. Typography
Segoe UI has been the voice of Microsoft since Windows Vista — a humanist sans-serif tuned specifically for screen legibility at small sizes, which is exactly what dense productivity software demands. The system leans on its variable weights: 400 for body, 600 (Semibold) for headings and emphasis, reserving 700 almost entirely. Segoe's open apertures keep 14px body text readable across spreadsheets and long settings lists.

Display and page titles run 28px Semibold; section headings 20px Semibold; subheadings 16px Semibold. Body is 14px/400, with a 12px caption size for metadata, timestamps, and helper text. The type ramp is deliberately compact — Fluent rarely exceeds 28px in product UI because the goal is information throughput, not editorial impact.

Cascadia Code (Microsoft's own monospace, designed for the terminal and VS Code) renders code blocks, Azure CLI snippets, resource IDs, and KQL queries. Monospace signals machine data the same way it does everywhere — a connection string is not a sentence, and the typeface makes that obvious.

## 4. Components & Patterns
**Command bar**:
- Horizontal toolbar of icon+label buttons (New, Upload, Share, Delete) at the top of any content region
- 40px height, Acrylic background, overflow collapses into a "..." flyout
- Primary action may be a filled blue button; the rest are subtle/text buttons

**Navigation rail (left nav)**:
- Vertical list of destinations with icon + label, ~48px row height
- Selected item shows a blue pill/bar indicator on the leading edge
- Collapsible to icon-only (48px) for more content width — the Office/Teams pattern

**Fluent button hierarchy**:
- Primary: filled #0078D4, white text — one per view
- Default (secondary): white fill, #8A8886 border, dark text
- Subtle: transparent until hover (#F3F2F1), used in command bars

**Acrylic flyout / context menu**:
- Floating panel with blurred translucent background and flyout shadow
- Houses overflow commands, account pickers, and right-click menus
- Rounded 8px corners, 4px internal item padding

**TextField with floating label**:
- Bottom-border emphasis on focus: border thickens to 2px #0078D4
- Inline validation message in #D13438 below the field
- Optional prefix/suffix icons inside the input

**DetailsList (data grid)**:
- Dense sortable table: 36–42px rows, sticky header, column resize
- Selection via leading checkboxes; row hover fills #F3F2F1
- The backbone of SharePoint, Azure resource lists, and admin centers

**Persona / avatar**:
- Circular avatar with presence dot (green available, amber away, red busy)
- Used throughout Teams, Outlook, and people pickers
- Falls back to initials on a brand-tinted circle

**MessageBar**:
- Full-width inline banner with leading icon, color-coded by intent (info blue, success green, warning amber, error red)
- Optional action links and dismiss button — non-modal status communication

**Mica window surface**:
- App background material that samples desktop wallpaper, tinted and desaturated
- Applies to title bars and base layers in WinUI apps — ties app to OS

**Pivot / Tabs**:
- Horizontal section switcher with an animated blue underline that slides between tabs
- Used in settings panes and detail views to segment content

## 5. Spacing & Layout
Fluent uses a 4px base grid, the tightest practical increment for productivity density. Standard content padding is 16–24px; cards use 16px internal padding; command bar height is 40px and the top app bar 48px. Nav rail rows are 48px to stay touch-safe while remaining compact.

Layouts favor a left nav rail + content pane structure, often with a right-hand details/properties pane that slides in (the Outlook reading pane, the Azure resource blade). Azure popularized the "blade" pattern — horizontally stacking panels that slide in from the right as the user drills deeper, each blade a self-contained context. Dialogs are centered with a scrim, max-width ~640px for standard, wider for data-heavy wizards.

## 6. Motion & Interaction
**Reveal highlight**: as the pointer approaches grouped controls, their borders and backgrounds illuminate with a soft radial light following the cursor — Fluent's signature "light reveals interactivity" behavior, ~100ms response.

**Connected / entrance animation**: panels and flyouts enter with a quick fade + slight upward or directional slide using the Fluent easing `cubic-bezier(0.1, 0.9, 0.2, 1)` — a decelerating curve that feels "settled" rather than bouncy, 200ms base duration.

**Pivot underline slide**: the blue tab indicator animates horizontally between sections rather than cutting, reinforcing spatial continuity at 200ms.

**Pressed depth**: buttons darken to the pressed token and depress subtly on click; no scale bounce — Fluent motion stays restrained and professional.

**Skeleton + shimmer**: data grids and cards show grey shimmer placeholders during load, sized to final content to prevent layout shift.

## Accessibility

### Contrast Ratios
- **#201F1E ink on #FAF9F8 canvas**: 16.4:1 — passes AAA
- **#201F1E ink on #FFFFFF surface**: 17.4:1 — passes AAA
- **#605E5C muted on #FFFFFF**: 5.7:1 — passes AA
- **#A19F9D subdued on #FFFFFF**: 2.6:1 — fails AA; use only for disabled/decorative text
- **#FFFFFF on #0078D4 primary**: 4.6:1 — passes AA
- **#0078D4 blue text on #FFFFFF**: 4.6:1 — passes AA for normal text
- **#107C10 success on #FFFFFF**: 4.7:1 — passes AA
- **#D13438 danger on #FFFFFF**: 4.6:1 — passes AA
- **#FFB900 warning on #FFFFFF**: 1.5:1 — fails AA; warning yellow must pair with an icon and dark text, never used as text on white

### Minimum Requirements
- **Touch target**: 44×44px minimum; control height 32px minimum for pointer with adequate hit-padding
- **Focus indicator**: high-visibility 2px focus rectangle (Fluent's "focus stroke"), honoring Windows high-contrast theme colors
- **High-contrast mode**: every token must map to a system high-contrast pairing — color is never the sole carrier of meaning
- **Keyboard**: full tab/arrow navigation, command bars and grids fully operable without a pointer

### Motion
- Respects `prefers-reduced-motion`: yes — Reveal highlight, connected animations, and pivot slides reduce to instant state changes
- Essential feedback (pressed, focus, selection) remains via color/border, never animation-only

### Notes
- #0078D4 at 4.6:1 passes AA but sits close to the threshold — for large blue text on white prefer the pressed #005A9E (7.0:1, AAA) to add margin
- #FFB900 warning yellow fails contrast as text; only ever use it as a fill or icon paired with #201F1E text
- Acrylic translucency must be tested for text legibility — content rendered on Acrylic requires a sufficiently opaque tint layer so foreground text holds ≥4.5:1 regardless of what shows through
- All neutrals are defined as theme tokens with dark and high-contrast counterparts; never hard-code hex in a component

</design-context>

Use the design system above for all UI you generate.