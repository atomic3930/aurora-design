# Aurora Design — Saltcorn Theme Plugin

A premium [Saltcorn](https://github.com/saltcorn/saltcorn) layout plugin with glassmorphism effects, smooth animations, full dark mode support, and a modern glass-inspired aesthetic built on Bootstrap 5.

## Features

- **Dual layout modes** — horizontal top navbar or vertical sidebar
- **Dark / light mode** toggle — per-user preference, persists across sessions
- **Glassmorphism** — frosted-glass navbar, sidebar, cards and modals
- **Smooth page transitions** and staggered card entrance animations
- **4 font families** — Inter, Outfit, Plus Jakarta Sans, System UI (native)
- **3 border-radius styles** — Sharp, Regular, Rounded
- **Full color customization** — separate primary and secondary colors per mode
- **Sidebar extras** — icon-only mode, hover-expand, pin/unpin button
- **Loading progress bar**, button ripple effects, Bootstrap tooltips/popovers
- Responsive and mobile-first (Bootstrap 5 offcanvas on small screens)
- No external npm dependencies — all assets served from CDN or Saltcorn's static file server

## Requirements

- Saltcorn ≥ 0.9.x (tested with current stable release)
- No npm install required — Bootstrap 5, Google Fonts and Font Awesome are loaded from CDN at runtime

## Installation

1. In your Saltcorn instance open **Settings → Plugins**.
2. Search for `aurora-design` and click **Install**.
3. Navigate to **Settings → Configuration → Layout** and select **Aurora Design**.
4. Click **Configure** to adjust the appearance settings.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| Default mode | String | `Light` | Initial color theme: `Light` or `Dark` |
| Navigation layout | String | `Horizontal` | `Horizontal` (top navbar) or `Vertical` (sidebar) |
| Font family | String | `inter` | `Inter` · `Outfit` · `Plus Jakarta Sans` · `System UI` |
| Border radius style | String | `regular` | `Sharp` (0 px) · `Regular` · `Rounded` |
| Navbar color scheme | String | Glass (auto) | `Glass` · `Dark` · `Primary` · `Light` · `White` · `Transparent Dark` *(horizontal only)* |
| Sidebar color scheme | String | Auto | `Auto` · `Dark` · `Primary` · `Light` · `White` *(vertical only)* |
| Fixed top navbar | Bool | `false` | Navbar stays visible while scrolling *(horizontal only)* |
| Icon-only sidebar | Bool | `false` | Hide labels, show icons only *(vertical only)* |
| Expand sidebar on hover | Bool | `false` | Expand icon-only sidebar on mouse hover *(vertical + icon-only)* |
| Fluid layout | Bool | `false` | Full-width content area instead of fixed container |
| Wrap content in card | Bool | `false` | Default page content wrapped in a glass card |
| Top padding | Integer | `2` | Top spacing for the first page section (0–5) |
| Gradient site name | Bool | `true` | Applies a gradient color effect to the brand name |
| Primary color (light) | Color | — | Custom primary color for light mode |
| Secondary color (light) | Color | — | Custom secondary color for light mode |
| Primary color (dark) | Color | — | Custom primary color for dark mode |
| Secondary color (dark) | Color | — | Custom secondary color for dark mode |

## Dark Mode Toggle Action

Aurora Design registers a **`toggle_aurora_dark_mode`** action that you can attach to any button or trigger inside your Saltcorn application. This lets users switch between light and dark mode at any time. The preference is saved per user and is restored automatically on the next visit.

## File Structure

```
aurora-design/
├── index.js          # Layout plugin entry point
├── adjust-color.js   # HSL-based color utility (adjustColor, hexToRgb)
├── public/
│   ├── css/
│   │   └── aurora.css   # Design tokens, component styles, dark mode
│   └── js/
│       └── aurora.js    # Animations, ripple effects, dark mode toggle
└── package.json
```

## License

MIT © Patrick Pasch
