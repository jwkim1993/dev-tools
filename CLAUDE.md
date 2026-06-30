# DevTools — Project Instructions

## Architecture
- Static site: HTML + CSS + JS only (Cloudflare Pages)
- Shared CSS: `/css/tokens.css`, `/css/layout.css`, `/css/components.css`
- Shared JS: `/js/nav.js`, `/js/utils.js`, `/js/cookie-consent.js`
- Each tool: `/<tool-name>/index.html`, `/<tool-name>/css/<name>.css`, `/<tool-name>/js/app.js`
- Design system: see `DESIGN.md` (Microsoft Fluent tokens)

## Page Structure Rules

### Spacing between tool area and educational content
When creating tool pages, add a clear visual separator (`.content-divider`) between the interactive tool section and the educational/SEO content below. The educational sections ("What is X?", features, FAQ) must have significant top margin (`margin-top: var(--space-10)` = 64px minimum) from the last tool UI element. Never let educational content sit directly below the tool output with only the default `section` margin.

Use this pattern:
```html
<!-- end of tool UI -->
<div class="content-divider"></div>
<!-- educational content sections start here -->
```

### Footer consistency
Every page must include all tools in the footer Tools column. When adding a new tool, update footers in ALL pages.

### SEO / AdSense content
Each tool page must include:
- Educational sections explaining the concept
- Features list
- FAQ section with structured data (FAQPage schema)
- WebApplication schema markup

### Nav links
When adding a new tool, update `NAV_LINKS` array in `/js/nav.js`.
