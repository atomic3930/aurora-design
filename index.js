const {
  ul,
  li,
  a,
  span,
  hr,
  div,
  text,
  i,
  h1,
  h3,
  p,
  header,
  footer,
  button,
  nav,
  img,
  aside,
  form,
  input,
  section,
  style,
} = require("@saltcorn/markup/tags");
const {
  headersInHead,
  headersInBody,
  alert,
  activeChecker,
  navbarSolidOnScroll,
} = require("@saltcorn/markup/layout_utils");
const renderLayout = require("@saltcorn/markup/layout");
const Form = require("@saltcorn/data/models/form");
const Workflow = require("@saltcorn/data/models/workflow");
const { renderForm, link } = require("@saltcorn/markup");
const { features, getState } = require("@saltcorn/data/db/state");
const Plugin = require("@saltcorn/data/models/plugin");
const User = require("@saltcorn/data/models/user");
const db = require("@saltcorn/data/db");
const { adjustColor, hexToRgb } = require("./adjust-color");

const verstring = features?.version_plugin_serve_path
  ? "@" + require("./package.json").version
  : "";

// ── Active-link helper ────────────────────────────────────────────────────────
const _activeChecker = activeChecker
  ? activeChecker
  : (link, currentUrl) => new RegExp(`^${link}(\\/|\\?|#|$)`).test(currentUrl);

const active = (currentUrl, item) => {
  if (item.link && _activeChecker(item.link, currentUrl)) return true;
  if (item.altlinks && item.altlinks.some((l) => _activeChecker(l, currentUrl)))
    return true;
  if (item.subitems && item.subitems.length > 0)
    return item.subitems.some((si) => active(currentUrl, si));
  return false;
};

// ── Colour config helper ──────────────────────────────────────────────────────
const getColor = (config, key) => {
  const mode = config?.mode || "light";
  if (mode === "light") return config?.[`${key}_color_light`] || (key === "primary" ? "#6366f1" : "#818cf8");
  return config?.[`${key}_color_dark`] || (key === "primary" ? "#818cf8" : "#6366f1");
};

// ── Separator ─────────────────────────────────────────────────────────────────
const sepItem = () => li({ class: "nav-item au-sep" }, hr({ class: "au-nav-hr my-1" }));

// ── Icon helper ───────────────────────────────────────────────────────────────
const navIcon = (icon) =>
  icon && icon !== "empty" && icon !== "undefined"
    ? i({ class: `fa-fw ${icon} au-nav-icon` })
    : "";

// ── Split primary / secondary menu ───────────────────────────────────────────
const splitPrimarySecondaryMenu = (menu) => ({
  primary: menu
    .map((mi) => ({
      ...mi,
      items: mi.items.filter(
        (item) => item.location !== "Secondary Menu" && mi.section !== "User" && !mi.isUser
      ),
    }))
    .filter(({ items }) => items.length),
  secondary: menu
    .map((mi) => ({
      ...mi,
      items: mi.items.filter(
        (item) => item.location === "Secondary Menu" || mi.section === "User" || mi.isUser
      ),
    }))
    .filter(({ items }) => items.length),
});

// ── Brand element ─────────────────────────────────────────────────────────────
const brandEl = (brand, config, cls = "") =>
  a(
    { href: "/", class: `navbar-brand au-brand ${cls}` },
    brand?.logo
      ? img({ src: brand.logo, alt: "Logo", width: "28", height: "28", class: "au-brand-logo me-2" })
      : "",
    !config?.hide_site_name || !brand?.logo
      ? span({ class: "au-brand-text" }, text(brand?.name || ""))
      : ""
  );

// ── Sidebar: nested sub-item ──────────────────────────────────────────────────
const sideSubItem = (currentUrl) => (item, ix) => {
  const is_active = active(currentUrl, item);
  if (!item.subitems) {
    return li(
      { class: "nav-item" },
      item.link
        ? a(
            {
              class: ["nav-link au-sidebar-link au-sidebar-link--sub", is_active && "active"],
              href: text(item.link),
            },
            navIcon(item.icon),
            text(item.label)
          )
        : span({ class: "nav-link au-sidebar-link au-sidebar-link--sub" }, text(item.label))
    );
  }
  const colId = `au_sub_${ix}_${Math.random().toString(36).slice(2, 6)}`;
  return li(
    { class: "nav-item" },
    a(
      {
        class: ["nav-link au-sidebar-link au-sidebar-link--sub d-flex align-items-center", is_active && "active"],
        href: `#${colId}`,
        "data-bs-toggle": "collapse",
        "aria-expanded": is_active ? "true" : "false",
      },
      navIcon(item.icon),
      text(item.label),
      span({ class: "ms-auto" }, i({ class: "au-chevron fas fa-chevron-down fa-xs" }))
    ),
    div(
      { class: ["collapse", is_active && "show"], id: colId },
      ul(
        { class: "nav flex-column w-100" },
        item.subitems.map(sideSubItem(currentUrl))
      )
    )
  );
};

// ── Sidebar: top-level item ───────────────────────────────────────────────────
const sideItem = (currentUrl, config, user, nitems) => (item, ix) => {
  const is_active = active(currentUrl, item);

  if (item.type === "Separator") return sepItem();

  if (item.type === "Search")
    return li(
      { class: "nav-item px-2 py-1" },
      form(
        { action: "/search", method: "get", autocomplete: "off", novalidate: "" },
        div(
          { class: "input-group input-group-sm" },
          span({ class: "input-group-text au-search-icon border-0" }, i({ class: "fas fa-search" })),
          input({ type: "text", class: "form-control au-search-input border-0", placeholder: "Search…" })
        )
      )
    );

  // Item with avatar (user menu)
  if (item.isUser && user?.email) {
    const avatarEl =
      config?.avatar_file && user[config.avatar_file]
        ? span({
            class: "au-avatar",
            style: `background-image: url(/files/resize/40/40/${user[config.avatar_file]})`,
          })
        : span({ class: "au-avatar au-avatar--initials" }, user.email[0].toUpperCase());
    return li(
      { class: ["nav-item dropup", is_active && "active"] },
      a(
        {
          class: "nav-link au-sidebar-link d-flex align-items-center gap-2",
          href: "#",
          "data-bs-toggle": "dropdown",
          role: "button",
          "aria-expanded": "false",
        },
        avatarEl,
        span({ class: "flex-grow-1 au-user-email text-truncate" }, user.email)
      ),
      ul(
        { class: "dropdown-menu au-dropdown-menu" },
        (item.subitems || []).map((si, six) =>
          li(
            si.link
              ? a({ class: "dropdown-item au-dropdown-item", href: text(si.link || "#") },
                  navIcon(si.icon), " ", si.label)
              : span({ class: "dropdown-header" }, si.label)
          )
        )
      )
    );
  }

  // Collapsible group
  if (item.subitems) {
    const colId = `au_col_${ix}`;
    return li(
      { class: "nav-item" },
      a(
        {
          class: ["nav-link au-sidebar-link d-flex align-items-center gap-2", is_active && "active"],
          href: `#${colId}`,
          "data-bs-toggle": "collapse",
          "aria-expanded": is_active ? "true" : "false",
          title: item.tooltip,
        },
        navIcon(item.icon),
        span({ class: "flex-grow-1 au-nav-label" }, text(item.label)),
        i({ class: "au-chevron fas fa-chevron-down fa-xs" })
      ),
      div(
        { class: ["collapse", is_active && "show"], id: colId },
        ul(
          { class: "nav flex-column w-100" },
          item.subitems.map(sideSubItem(currentUrl))
        )
      )
    );
  }

  // Plain link
  return li(
    { class: "nav-item" },
    a(
      {
        class: ["nav-link au-sidebar-link d-flex align-items-center gap-2", item.style || "", is_active && "active"],
        href: text(item.link || "#"),
        ...(item.tooltip ? { title: item.tooltip } : {}),
        ...(is_active ? { "aria-current": "page" } : {}),
      },
      navIcon(item.icon),
      span({ class: "au-nav-label" }, text(item.label))
    )
  );
};

const sideSection = (currentUrl, config, user) => (sec) =>
  sec.items.map(sideItem(currentUrl, config, user, sec.items.length)).join("");

// ── Sidebar content (shared desktop + offcanvas) ──────────────────────────────
const sidebarContent = (brand, primary, secondary, currentUrl, config, user) =>
  div(
    { class: "d-flex flex-column h-100 w-100" },
    // Brand
    div(
      { class: "au-sidebar-brand" },
      a(
        { href: "/", class: "text-decoration-none d-flex align-items-center gap-2" },
        brand?.logo
          ? img({ src: brand.logo, alt: "Logo", width: "28", height: "28", class: "au-brand-logo" })
          : "",
        !config?.hide_site_name || !brand?.logo
          ? span({ class: "au-brand-text" }, text(brand?.name || ""))
          : ""
      )
    ),
    // Primary nav
    div(
      { class: "au-sidebar-nav flex-grow-1 overflow-y-auto" },
      ul(
        { class: "nav flex-column w-100" },
        primary.map(sideSection(currentUrl, config, user)).join("")
      )
    ),
    // Secondary (user/bottom) nav
    secondary.length
      ? div(
          { class: "au-sidebar-footer" },
          ul(
            { class: "nav flex-column w-100" },
            secondary.map(sideSection(currentUrl, config, user)).join("")
          )
        )
      : ""
  );

// ── Vertical layout: sidebar + mobile bar ─────────────────────────────────────
const vertical_header_sections = (brand, primary, secondary, currentUrl, config, user) => {
  const sc = sidebarContent(brand, primary, secondary, currentUrl, config, user);
  const theme = config?.colorscheme || "";
  const darkAttr = theme.includes("dark") ? { "data-bs-theme": "dark" } : {};
  const lightAttr = theme.includes("light") ? { "data-bs-theme": "light" } : {};
  const themeAttrs = theme.includes("dark") ? darkAttr : theme.includes("light") ? lightAttr : {};

  return (
    // Desktop fixed sidebar
    aside(
      {
        id: "au-sidebar",
        class: ["au-sidebar d-none d-lg-flex flex-column", theme],
        ...themeAttrs,
      },
      sc
    ) +
    // Mobile offcanvas
    div(
      {
        class: "offcanvas offcanvas-start au-offcanvas",
        tabindex: "-1",
        id: "au-sidebar-mobile",
        style: "width: var(--au-sidebar-width, 260px);",
        ...themeAttrs,
      },
      div({ class: "offcanvas-body p-0 d-flex flex-column" }, sc)
    ) +
    // Mobile top bar
    header(
      {
        class: ["au-mobile-bar navbar d-lg-none", theme],
        ...themeAttrs,
      },
      div(
        { class: "container-fluid" },
        button(
          {
            class: "btn btn-sm au-menu-btn me-2",
            type: "button",
            "data-bs-toggle": "offcanvas",
            "data-bs-target": "#au-sidebar-mobile",
            "aria-label": "Toggle navigation",
          },
          i({ class: "fas fa-bars" })
        ),
        brand ? brandEl(brand, config) : "",
        div({ class: "ms-auto" },
          ul(
            { class: "navbar-nav flex-row" },
            secondary.map(sideSection(currentUrl, config, user)).join("")
          )
        )
      )
    )
  );
};

// ── Horizontal navbar ─────────────────────────────────────────────────────────
const renderNavDropdown = (item, parentId, subIx, dir = "start") => {
  if (!item.subitems || !item.subitems.length) {
    return a(
      { class: "dropdown-item au-dropdown-item", href: text(item.link || "#") },
      navIcon(item.icon),
      item.label
    );
  }
  return div(
    { class: `dropdown-item dropstart au-hover-dropdown-item` },
    a(
      {
        type: "button",
        class: "dropdown-item dropdown-toggle p-0",
        "data-bs-toggle": "dropdown",
        "aria-expanded": "false",
      },
      item.label
    ),
    ul(
      { class: "dropdown-menu au-dropdown-menu" },
      item.subitems.map((si, siIx) => li(renderNavDropdown(si, `${parentId}_${subIx}`, siIx)))
    )
  );
};

const horizontal_header_sections = (brand, primary, secondary, currentUrl, config, user, title) => {
  const scheme = config?.colorscheme || "";
  const darkAttr = scheme.includes("navbar-dark") ? { "data-bs-theme": "dark" } : {};
  const lightAttr = scheme.includes("navbar-light") ? { "data-bs-theme": "light" } : {};
  const themeAttrs = scheme.includes("dark") ? darkAttr : scheme.includes("light") ? lightAttr : {};

  const allItems = [...primary]
    .map((s) => s.items)
    .flat()
    .map((item, ix) => {
      if (item.type === "Separator")
        return li({ class: "nav-item" }, div({ class: "vr mx-2 au-nav-sep" }));
      if (item.subitems && item.subitems.length)
        return li(
          { class: "nav-item dropdown" },
          a(
            {
              class: ["nav-link au-nav-link dropdown-toggle", active(currentUrl, item) && "active"],
              href: "#",
              id: `au_dd_${ix}`,
              role: "button",
              "data-bs-toggle": "dropdown",
              "data-bs-auto-close": "outside",
              "aria-expanded": "false",
            },
            navIcon(item.icon),
            item.label
          ),
          ul(
            { class: "dropdown-menu au-dropdown-menu", "aria-labelledby": `au_dd_${ix}` },
            item.subitems.map((si, six) => li(renderNavDropdown(si, `au_dd_${ix}`, six)))
          )
        );
      return li(
        {
          class: [
            "nav-item",
            active(currentUrl, item) && "active",
            item.style && item.style.includes("btn") && "nav-item-btn",
          ],
        },
        a(
          {
            class: [
              !item.style || !item.style.includes("btn") ? "nav-link au-nav-link" : "btn btn-sm",
              item.style || "",
              active(currentUrl, item) && "active",
            ],
            href: text(item.link || "#"),
            ...(item.tooltip ? { title: item.tooltip } : {}),
          },
          navIcon(item.icon),
          item.label
        )
      );
    });

  const secItems = [...secondary]
    .map((s) => s.items)
    .flat()
    .map((item, ix) => {
      if (item.subitems && item.subitems.length)
        return li(
          { class: "nav-item dropdown" },
          a(
            {
              class: ["nav-link au-nav-link dropdown-toggle", active(currentUrl, item) && "active"],
              href: "#",
              id: `au_sec_${ix}`,
              role: "button",
              "data-bs-toggle": "dropdown",
              "data-bs-auto-close": "outside",
              "aria-expanded": "false",
            },
            navIcon(item.icon),
            item.label
          ),
          ul(
            { class: "dropdown-menu dropdown-menu-end au-dropdown-menu", "aria-labelledby": `au_sec_${ix}` },
            item.subitems.map((si, six) => li(renderNavDropdown(si, `au_sec_${ix}`, six, "end")))
          )
        );
      return li(
        { class: "nav-item" },
        a(
          {
            class: ["nav-link au-nav-link", active(currentUrl, item) && "active"],
            href: text(item.link || "#"),
          },
          navIcon(item.icon),
          item.label
        )
      );
    });

  return nav(
    {
      class: [
        "navbar navbar-expand-md au-navbar d-print-none",
        config?.fixedTop && "fixed-top",
        scheme,
      ],
      id: "mainNav",
      ...themeAttrs,
    },
    div(
      { class: config?.fluid ? "container-fluid" : "container" },
      brand ? brandEl(brand, config) : "",
      button(
        {
          class: "navbar-toggler border-0",
          type: "button",
          "data-bs-toggle": "collapse",
          "data-bs-target": "#auNavbar",
          "aria-controls": "auNavbar",
          "aria-expanded": "false",
          "aria-label": "Toggle navigation",
        },
        span({ class: "navbar-toggler-icon" })
      ),
      div(
        { class: "collapse navbar-collapse", id: "auNavbar" },
        ul(
          { class: "navbar-nav ms-auto my-2 my-lg-0 align-items-center gap-1" },
          [...allItems, ...secItems].join("")
        )
      )
    )
  );
};

// ── header_sections dispatcher ────────────────────────────────────────────────
const header_sections = (brand, sections, currentUrl, config, user, title) => {
  if (!sections && !brand) return "";
  const { primary, secondary } = splitPrimarySecondaryMenu(sections || []);
  if (config?.layout_style === "Vertical")
    return vertical_header_sections(brand, primary, secondary, currentUrl, config, user);
  return horizontal_header_sections(brand, primary, secondary, currentUrl, config, user, title);
};

// ── Block dispatch (page content blocks) ──────────────────────────────────────
const blockDispatch = (config) => ({
  pageHeader: ({ title, blurb }) =>
    div(
      { class: "au-page-header mb-4" },
      h1({ class: "au-page-title" }, title),
      blurb ? p({ class: "au-page-blurb text-muted" }, blurb) : ""
    ),
  footer: ({ contents }) =>
    footer({ id: "au-footer", class: "au-footer" }, div({ class: "container" }, contents)),
  hero: ({ caption, blurb, cta, backgroundImage }) =>
    section(
      {
        class: "au-hero",
        style: backgroundImage
          ? `background-image: url("${backgroundImage}"); background-size: cover; background-position: center;`
          : "",
      },
      div(
        { class: "container" },
        h1({ class: "au-hero-title" }, caption),
        blurb ? p({ class: "au-hero-blurb" }, blurb) : "",
        cta ? div({ class: "au-hero-cta" }, cta) : ""
      )
    ),
  noBackgroundAtTop: () => true,
  wrapTop: (segment, ix, s) =>
    ["hero", "footer"].includes(segment.type) || segment.noWrapTop
      ? s
      : section(
          {
            class: [
              "page-section fw-check",
              segment.class,
              segment.invertColor && "bg-primary",
            ],
            style: segment.bgType === "Color" ? `background-color: ${segment.bgColor};` : "",
          },
          div({ class: config?.fluid ? "container-fluid" : "container" }, s)
        ),
});

// ── renderBody ────────────────────────────────────────────────────────────────
const renderBody = (title, body, alerts, config, role, req) =>
  renderLayout({
    blockDispatch: blockDispatch(config),
    role,
    req,
    layout:
      typeof body === "string" && config.in_card ? { type: "card", title, contents: body } : body,
    alerts,
  });

// ── Auth links ────────────────────────────────────────────────────────────────
const renderAuthLinks = (authLinks) => {
  const links = [];
  if (authLinks.login) links.push(link(authLinks.login, "Already have an account? Login!"));
  if (authLinks.forgot) links.push(link(authLinks.forgot, "Forgot password?"));
  if (authLinks.signup) links.push(link(authLinks.signup, "Create an account!"));
  const methLinks = (authLinks.methods || [])
    .map(({ url, icon, label }) =>
      a({ href: url, class: "btn btn-outline-secondary btn-block mb-2 w-100" }, icon || "", ` Login with ${label}`)
    )
    .join("");
  return methLinks + links.map((l) => div({ class: "text-center mt-2" }, l)).join("");
};

// ── Font helpers ──────────────────────────────────────────────────────────────
const FONTS = {
  inter: {
    link: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  outfit: {
    link: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
    family: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  plus_jakarta: {
    link: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  system: {
    link: "",
    family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

const RADII = {
  sharp:   { sm: "0.125rem", md: "0.25rem", lg: "0.5rem",  xl: "0.75rem" },
  regular: { sm: "0.375rem", md: "0.5rem",  lg: "0.75rem", xl: "1rem"    },
  rounded: { sm: "0.625rem", md: "0.875rem", lg: "1.25rem", xl: "2rem"   },
};

// ── wrapIt — full HTML document ───────────────────────────────────────────────
const wrapIt = (config, bodyAttr, headers, title, body, req, requestFluidLayout) => {
  const primary   = getColor(config, "primary");
  const secondary = getColor(config, "secondary");
  const pRgb = hexToRgb(primary);
  const sRgb = hexToRgb(secondary);

  const pLight  = adjustColor(primary, { l: +30 });
  const pDark   = adjustColor(primary, { l: -15 });
  const pSubtle = adjustColor(primary, { l: +42, a: 0.12 });
  const pHover  = adjustColor(primary, { l: -6 });

  const font   = FONTS[config?.font_family || "inter"] || FONTS.inter;
  const radii  = RADII[config?.border_radius_style || "regular"] || RADII.regular;

  const isRTL    = req?.isRTL || false;
  const langCode = req?.getLocale?.() || "en";
  const isDark   = config?.mode === "dark";
  const isVertical = config?.layout_style === "Vertical";

  // accent from secondary for gradient variety
  const accent = secondary;

  return `<!doctype html>
<html lang="${langCode}" data-bs-theme="${config?.mode || "light"}"${isRTL ? ' dir="rtl"' : ""}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <!-- Bootstrap 5 -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.4/css/all.css">

  <!-- Google Fonts -->
  ${font.link ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${font.link}">` : ""}

  <!-- Aurora Design CSS -->
  <link rel="stylesheet" href="/plugins/public/aurora-design${verstring}/css/aurora.css?v=4">

  ${headersInHead(headers)}

  <style>
  /* ── Dynamic theme tokens ── */
  :root {
    --au-primary:        ${primary};
    --au-primary-rgb:    ${pRgb};
    --au-secondary:      ${secondary};
    --au-secondary-rgb:  ${sRgb};
    --au-accent:         ${accent};
    --au-primary-light:  ${pLight};
    --au-primary-dark:   ${pDark};
    --au-primary-subtle: ${pSubtle};
    --au-primary-hover:  ${pHover};

    --au-radius-sm: ${radii.sm};
    --au-radius:    ${radii.md};
    --au-radius-lg: ${radii.lg};
    --au-radius-xl: ${radii.xl};
    --au-font:      ${font.family};

    /* Bootstrap token overrides */
    --bs-primary:           ${primary};
    --bs-secondary:         ${secondary};
    --bs-primary-rgb:       ${pRgb};
    --bs-secondary-rgb:     ${sRgb};
    --bs-link-color:        ${primary};
    --bs-link-hover-color:  ${pHover};
    --bs-link-color-rgb:    ${pRgb};
    --bs-border-radius:     ${radii.md};
    --bs-border-radius-sm:  ${radii.sm};
    --bs-border-radius-lg:  ${radii.lg};
    --bs-border-radius-xl:  ${radii.xl};
    --bs-primary-text-emphasis:   ${adjustColor(primary, { l: -12 })};
    --bs-primary-bg-subtle:       ${adjustColor(primary, { l: +40 })};
    --bs-primary-border-subtle:   ${adjustColor(primary, { l: +28 })};
  }
  [data-bs-theme="dark"] {
    --bs-primary:          ${primary};
    --bs-secondary:        ${secondary};
    --bs-link-color:       ${adjustColor(primary, { l: +20 })};
    --bs-link-hover-color: ${adjustColor(primary, { l: +30 })};
    --bs-primary-text-emphasis:   ${adjustColor(primary, { l: +50 })};
    --bs-primary-bg-subtle:       ${adjustColor(primary, { l: -30 })};
  }
  .btn-primary {
    --bs-btn-bg:                 ${primary};
    --bs-btn-border-color:       ${primary};
    --bs-btn-hover-bg:           ${pHover};
    --bs-btn-hover-border-color: ${pHover};
    --bs-btn-active-bg:          ${adjustColor(primary, { l: -12 })};
    --bs-btn-focus-shadow-rgb:   ${pRgb};
  }
  .btn-outline-primary {
    --bs-btn-color:              ${primary};
    --bs-btn-border-color:       ${primary};
    --bs-btn-hover-bg:           ${primary};
    --bs-btn-hover-border-color: ${primary};
    --bs-btn-hover-color:        #fff;
    --bs-btn-active-bg:          ${pHover};
    --bs-btn-focus-shadow-rgb:   ${pRgb};
  }
  .btn-secondary {
    --bs-btn-bg:                 ${secondary};
    --bs-btn-border-color:       ${secondary};
    --bs-btn-hover-bg:           ${adjustColor(secondary, { l: -8 })};
    --bs-btn-hover-border-color: ${adjustColor(secondary, { l: -8 })};
  }
  .form-control:focus,
  .form-select:focus {
    border-color: ${primary};
    box-shadow: 0 0 0 3px rgba(${pRgb}, 0.14);
  }
  .form-check-input:checked {
    background-color: ${primary};
    border-color:     ${primary};
  }
  .form-check-input:focus {
    box-shadow: 0 0 0 3px rgba(${pRgb}, 0.14);
  }
  /* Active sidebar item */
  .au-sidebar-link.active,
  .au-sidebar-link:focus-visible.active {
    background: rgba(${pRgb}, 0.1);
    color: ${primary};
  }
  .au-sidebar-link:hover {
    color: ${primary};
  }
  /* Active nav link indicator */
  .au-nav-link.active::after {
    background: ${primary};
  }
  </style>

  <title>${text(title)}</title>
</head>
<body ${bodyAttr}
  class="${isDark ? "au-dark" : ""} ${config?.fluid || requestFluidLayout ? "au-fluid" : ""} ${isVertical ? "layout-vertical" : "layout-horizontal"} ${!isVertical && config?.fixedTop ? "fixed-top-layout" : ""}">

  <!-- Loading progress bar -->
  <div id="au-loader" class="au-loader" role="progressbar" aria-label="Page loading"></div>

  <div id="au-wrapper">
    ${header_sections(
      body.__brand !== undefined ? body.__brand : null,
      body.__menu !== undefined ? body.__menu : null,
      body.__currentUrl || "",
      config,
      body.__user,
      title
    )}
    <div id="au-content" class="au-content${isVertical ? "" : " au-content--horizontal"}">
      <div class="${config?.fluid || requestFluidLayout ? "container-fluid" : "container"}">
        <div class="row">
          <div class="col-sm-12" id="page-inner-content">
            ${body}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bootstrap Bundle (includes Popper) -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <!-- jQuery (for Saltcorn compatibility) -->
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
  <!-- Aurora JS -->
  <script src="/plugins/public/aurora-design${verstring}/js/aurora.js?v=4"></script>
  <script>
    /* expose config for JS */
    window.__auroraConfig = ${JSON.stringify(config || {})};
    /* Bootstrap alias for Saltcorn compat */
    window.bootstrap = window.bootstrap;
  </script>
  ${headersInBody(headers)}
</body>
</html>`;
};

// ── The real wrap function (standard Saltcorn signature) ──────────────────────
const wrapPage = (config, bodyAttr, headers, title, body, req, requestFluidLayout) => {
  const primary   = getColor(config, "primary");
  const secondary = getColor(config, "secondary");
  const pRgb = hexToRgb(primary);
  const sRgb = hexToRgb(secondary);

  const pLight  = adjustColor(primary, { l: +30 });
  const pDark   = adjustColor(primary, { l: -15 });
  const pSubtle = adjustColor(primary, { l: +42, a: 0.12 });
  const pHover  = adjustColor(primary, { l: -6 });

  const font   = FONTS[config?.font_family || "inter"] || FONTS.inter;
  const radii  = RADII[config?.border_radius_style || "regular"] || RADII.regular;

  const isRTL    = req?.isRTL || false;
  const langCode = req?.getLocale?.() || "en";
  const isDark   = config?.mode === "dark";
  const isVertical = config?.layout_style === "Vertical";
  const accent = secondary;

  const bgColor = isDark
    ? config?.bg_color_dark || "#0f1117"
    : config?.bg_color_light || "#f8f9fa";
  const surfaceColor = isDark
    ? config?.surface_color_dark || "#1a1d27"
    : config?.surface_color_light || "#ffffff";

  const gradientCSS = config?.use_gradient ? `
  .btn-primary {
    background: linear-gradient(135deg, ${primary}, ${secondary}) !important;
    border-color: transparent !important;
  }
  .btn-primary:hover, .btn-primary:focus {
    background: linear-gradient(135deg, ${pHover}, ${adjustColor(secondary, { l: -6 })}) !important;
  }
  .au-nav-link.active::after {
    background: linear-gradient(135deg, ${primary}, ${secondary}) !important;
  }
  .au-sidebar-link.active {
    background: linear-gradient(135deg, rgba(${pRgb}, 0.15), rgba(${sRgb}, 0.08)) !important;
  }
  .au-hero {
    background: linear-gradient(135deg, ${primary}, ${secondary}) !important;
    color: #fff;
  }` : "";

  const iconOnlyCSS = config?.sidebar_icon_only && config?.layout_style === "Vertical" ? `
  .au-icon-only { --au-sidebar-width: 68px; }
  .au-icon-only .au-sidebar { overflow: visible; }
  .au-icon-only .au-sidebar-nav,
  .au-icon-only .au-sidebar-footer { overflow: visible; }
  .au-icon-only .au-sidebar-link { justify-content: center; gap: 0; padding: 0.6rem 0; }
  .au-icon-only .au-nav-label { display: none; }
  .au-icon-only .au-chevron  { display: none; }
  .au-icon-only .au-brand-text { display: none; }
  .au-icon-only .au-sidebar-brand a { justify-content: center; width: 100%; }
  .au-icon-only .au-sidebar-brand { padding: 1rem 0; }
  .au-icon-only .au-nav-icon { font-size: 1.1rem; opacity: 0.85; }
  .au-icon-only .nav-item { position: relative; }
  .au-icon-only .collapse.show {
    position: absolute;
    left: 68px;
    top: 0;
    min-width: 180px;
    background: var(--au-surface);
    border: 1px solid var(--au-border);
    border-radius: var(--au-radius);
    box-shadow: var(--au-shadow-md);
    z-index: 2000;
    padding: 0.25rem;
    height: auto !important;
    overflow: visible !important;
  }
  .au-icon-only .collapse.show .au-sidebar-link--sub { padding-left: 0.75rem; }` : "";

  const FULL_WIDTH = "260px";

  const hoverExpandCSS = config?.sidebar_hover_expand && config?.sidebar_icon_only && config?.layout_style === "Vertical" ? `
  .au-icon-only .au-sidebar {
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  body.au-sidebar-expanded .au-sidebar,
  body.au-sidebar-pinned   .au-sidebar {
    width: ${FULL_WIDTH};
    overflow-y: auto;
  }
  body.layout-vertical.au-icon-only {
    transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  body.layout-vertical.au-icon-only.au-sidebar-expanded,
  body.layout-vertical.au-icon-only.au-sidebar-pinned {
    margin-left: ${FULL_WIDTH};
  }
  body.au-sidebar-expanded .au-nav-label,
  body.au-sidebar-pinned   .au-nav-label { display: inline; }
  body.au-sidebar-expanded .au-chevron,
  body.au-sidebar-pinned   .au-chevron { display: inline; }
  body.au-sidebar-expanded .au-brand-text,
  body.au-sidebar-pinned   .au-brand-text { display: inline; }
  body.au-sidebar-expanded .au-sidebar-link,
  body.au-sidebar-pinned   .au-sidebar-link {
    justify-content: flex-start;
    gap: 0.625rem;
    padding: 0.45rem 0.75rem;
  }
  body.au-sidebar-expanded .au-sidebar-brand a,
  body.au-sidebar-pinned   .au-sidebar-brand a { justify-content: flex-start; }
  body.au-sidebar-expanded .au-sidebar-brand,
  body.au-sidebar-pinned   .au-sidebar-brand { padding: 1.125rem 1rem; }
  body.au-sidebar-expanded .collapse.show,
  body.au-sidebar-pinned   .collapse.show {
    position: static !important;
    box-shadow: none !important;
    border: none !important;
    background: transparent !important;
    min-width: unset !important;
    padding: 0 !important;
    z-index: unset !important;
    height: unset !important;
    overflow: visible !important;
  }
  .au-pin-btn {
    position: absolute;
    top: 0.8rem; right: 0.75rem;
    display: none;
    background: none;
    border: none;
    color: var(--au-text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.25rem 0.35rem;
    border-radius: var(--au-radius-sm);
    opacity: 0.45;
    transition: opacity 0.15s, background 0.15s;
    line-height: 1;
  }
  .au-pin-btn:hover { opacity: 1; background: var(--au-hover-bg); }
  .au-pin-btn.active { opacity: 1; color: var(--au-primary); transform: rotate(30deg); }
  body.au-sidebar-expanded .au-pin-btn,
  body.au-sidebar-pinned   .au-pin-btn { display: block; }` : "";

  const brandGradientCSS = config?.brand_gradient === false ? `
  .au-brand-text {
    background: none !important;
    -webkit-background-clip: unset !important;
    -webkit-text-fill-color: unset !important;
    background-clip: unset !important;
    color: var(--au-text) !important;
  }` : "";

  const hoverExpandJS = config?.sidebar_hover_expand && config?.sidebar_icon_only && config?.layout_style === "Vertical" ? `
<script>
(function() {
  var KEY = 'au-sidebar-pinned';
  var pinned = localStorage.getItem(KEY) === '1';
  if (pinned) document.body.classList.add('au-sidebar-pinned');

  document.addEventListener('DOMContentLoaded', function() {
    var sidebar = document.getElementById('au-sidebar');
    if (!sidebar) return;

    sidebar.addEventListener('mouseenter', function() {
      document.body.classList.add('au-sidebar-expanded');
    });
    sidebar.addEventListener('mouseleave', function() {
      if (!pinned) document.body.classList.remove('au-sidebar-expanded');
    });

    var brand = sidebar.querySelector('.au-sidebar-brand');
    if (!brand) return;
    brand.style.position = 'relative';
    var btn = document.createElement('button');
    btn.className = 'au-pin-btn' + (pinned ? ' active' : '');
    btn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    btn.title = pinned ? 'Sidebar lösen' : 'Sidebar anpinnen';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      pinned = !pinned;
      document.body.classList.toggle('au-sidebar-pinned', pinned);
      if (pinned) document.body.classList.add('au-sidebar-expanded');
      localStorage.setItem(KEY, pinned ? '1' : '0');
      btn.classList.toggle('active', pinned);
      btn.title = pinned ? 'Sidebar lösen' : 'Sidebar anpinnen';
    });
    brand.appendChild(btn);
  });
})();
</script>` : "";

  return `<!doctype html>
<html lang="${langCode}" data-bs-theme="${config?.mode || "light"}"${isRTL ? ' dir="rtl"' : ""}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <!-- Bootstrap 5 -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.4/css/all.css">

  <!-- Google Fonts -->
  ${font.link ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${font.link}">` : ""}

  <!-- Aurora Design CSS -->
  <link rel="stylesheet" href="/plugins/public/aurora-design${verstring}/css/aurora.css?v=4">

  ${headersInHead(headers)}

  <style>
  :root {
    --au-primary:        ${primary};
    --au-primary-rgb:    ${pRgb};
    --au-secondary:      ${secondary};
    --au-secondary-rgb:  ${sRgb};
    --au-accent:         ${accent};
    --au-primary-light:  ${pLight};
    --au-primary-dark:   ${pDark};
    --au-primary-subtle: ${pSubtle};
    --au-primary-hover:  ${pHover};

    --au-radius-sm: ${radii.sm};
    --au-radius:    ${radii.md};
    --au-radius-lg: ${radii.lg};
    --au-radius-xl: ${radii.xl};
    --au-font:      ${font.family};

    --bs-primary:           ${primary};
    --bs-secondary:         ${secondary};
    --bs-primary-rgb:       ${pRgb};
    --bs-secondary-rgb:     ${sRgb};
    --bs-link-color:        ${primary};
    --bs-link-hover-color:  ${pHover};
    --bs-link-color-rgb:    ${pRgb};
    --bs-border-radius:     ${radii.md};
    --bs-border-radius-sm:  ${radii.sm};
    --bs-border-radius-lg:  ${radii.lg};
    --bs-border-radius-xl:  ${radii.xl};
    --bs-primary-text-emphasis:   ${adjustColor(primary, { l: -12 })};
    --bs-primary-bg-subtle:       ${adjustColor(primary, { l: +40 })};
    --bs-primary-border-subtle:   ${adjustColor(primary, { l: +28 })};
    --au-bg:      ${bgColor};
    --au-surface: ${surfaceColor};
    --bs-body-bg: ${bgColor};
  }
  [data-bs-theme="dark"] {
    --bs-primary:          ${primary};
    --bs-secondary:        ${secondary};
    --bs-link-color:       ${adjustColor(primary, { l: +20 })};
    --bs-link-hover-color: ${adjustColor(primary, { l: +30 })};
    --bs-primary-text-emphasis:   ${adjustColor(primary, { l: +50 })};
    --bs-primary-bg-subtle:       ${adjustColor(primary, { l: -30 })};
  }
  .btn-primary {
    --bs-btn-bg:                 ${primary};
    --bs-btn-border-color:       ${primary};
    --bs-btn-hover-bg:           ${pHover};
    --bs-btn-hover-border-color: ${pHover};
    --bs-btn-active-bg:          ${adjustColor(primary, { l: -12 })};
    --bs-btn-focus-shadow-rgb:   ${pRgb};
  }
  .btn-outline-primary {
    --bs-btn-color:              ${primary};
    --bs-btn-border-color:       ${primary};
    --bs-btn-hover-bg:           ${primary};
    --bs-btn-hover-border-color: ${primary};
    --bs-btn-hover-color:        #fff;
    --bs-btn-active-bg:          ${pHover};
    --bs-btn-focus-shadow-rgb:   ${pRgb};
  }
  .btn-secondary {
    --bs-btn-bg:                 ${secondary};
    --bs-btn-border-color:       ${secondary};
    --bs-btn-hover-bg:           ${adjustColor(secondary, { l: -8 })};
    --bs-btn-hover-border-color: ${adjustColor(secondary, { l: -8 })};
  }
  .form-control:focus, .form-select:focus {
    border-color: ${primary};
    box-shadow: 0 0 0 3px rgba(${pRgb}, 0.14);
  }
  .form-check-input:checked { background-color: ${primary}; border-color: ${primary}; }
  .form-check-input:focus   { box-shadow: 0 0 0 3px rgba(${pRgb}, 0.14); }
  .au-sidebar-link.active   { background: rgba(${pRgb}, 0.1); color: ${primary}; }
  .au-sidebar-link:hover    { color: ${primary}; }
  .au-nav-link.active::after { background: ${primary}; }
  .au-progress-bar          { background: linear-gradient(90deg, ${primary}, ${accent}); }
  /* Scrolled state for fixed transparent navbar */
  .au-navbar.au-navbar--scrolled {
    background: ${isDark ? `rgba(13,13,26,0.92)` : `rgba(255,255,255,0.92)`} !important;
    box-shadow: 0 1px 20px rgba(0,0,0,${isDark ? "0.3" : "0.08"}) !important;
  }
  /* Background & surface colors */
  body { background-color: ${bgColor} !important; }
  .card, .au-card, .modal-content, .offcanvas,
  .list-group, .table-responsive { background-color: ${surfaceColor}; }
  ${gradientCSS}
  ${iconOnlyCSS}
  ${hoverExpandCSS}
  ${brandGradientCSS}
  </style>

  <title>${text(title)}</title>
</head>
<body ${bodyAttr}
  class="${isDark ? "au-dark" : ""} ${config?.fluid || requestFluidLayout ? "au-fluid" : ""} ${isVertical ? "layout-vertical" : "layout-horizontal"} ${!isVertical && config?.fixedTop ? "fixed-top-layout" : ""} ${isVertical && config?.sidebar_icon_only ? "au-icon-only" : ""}">

  <div id="au-loader" class="au-loader" role="progressbar" aria-label="Page loading"></div>

  <div id="au-wrapper">
    ${body}
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
  <script src="/plugins/public/aurora-design${verstring}/js/aurora.js?v=4"></script>
  <script>
    window.__auroraConfig = ${JSON.stringify(config || {})};
    window.bootstrap = window.bootstrap;
    window.config = window.__auroraConfig;
  </script>
  ${hoverExpandJS}
  ${headersInBody(headers)}
</body>
</html>`;
};

// ── Auth page wrapper ─────────────────────────────────────────────────────────
const formModify = (form) => {
  form.formStyle = "vert";
  form.submitButtonClass = "btn-primary btn-block w-100 mt-2";
  return form;
};

// ── Layout export ─────────────────────────────────────────────────────────────
const layout = (config) => ({
  wrap: ({ title, menu, brand, alerts, currentUrl, body, headers, role, req, requestFluidLayout }) => {
    const sections = menu;
    const innerBody =
      header_sections(brand, sections, currentUrl, config, req?.user, title) +
      `<div id="au-content" class="au-content${config?.layout_style === "Vertical" ? "" : " au-content--horizontal"}">
         <div class="${config?.fluid || requestFluidLayout ? "container-fluid" : "container"}">
           <div class="row">
             <div class="col-sm-12" id="page-inner-content">
               ${renderBody(title, body, alerts, requestFluidLayout ? { ...config, fluid: true } : config, role, req)}
             </div>
           </div>
         </div>
       </div>`;

    return wrapPage(config, 'id="page-top"', headers, title, innerBody, req, requestFluidLayout);
  },

  renderBody: ({ title, body, alerts, role, req }) =>
    renderBody(title, body, alerts, config, role, req),

  authWrap: ({ title, alerts, form, afterForm, headers, brand, csrfToken, authLinks }) =>
    wrapPage(
      config,
      'class="au-auth-body"',
      headers,
      title,
      `<div class="au-auth-page">
         <div class="au-auth-blob au-auth-blob--1"></div>
         <div class="au-auth-blob au-auth-blob--2"></div>
         <div class="au-auth-card">
           ${brand?.logo ? `<img class="au-auth-logo mb-3" src="${brand.logo}" alt="Logo" width="48" height="48">` : ""}
           <h3 class="au-auth-title">${text(title)}</h3>
           <p class="au-auth-subtitle text-muted mb-4">Welcome back</p>
           ${alerts.map((a) => alert(a.type, a.msg)).join("")}
           ${renderForm(formModify(form), csrfToken)}
           ${renderAuthLinks(authLinks)}
           ${afterForm || ""}
         </div>
       </div>`,
      null,
      false
    ),
});

// ── User config form (per-user mode toggle) ───────────────────────────────────
const user_config_form = (ctx) =>
  new Form({
    fields: [
      {
        name: "mode",
        label: "Mode",
        type: "String",
        required: true,
        default: ctx?.mode || "light",
        attributes: { options: [{ name: "light", label: "Light" }, { name: "dark", label: "Dark" }] },
      },
    ],
  });

// ── Configuration workflow ────────────────────────────────────────────────────
const configuration_workflow = (config) =>
  new Workflow({
    onDone: (ctx) => ctx,
    steps: [
      {
        name: "Appearance",
        form: async () =>
          new Form({
            fields: [
              {
                name: "mode",
                label: "Color mode",
                type: "String",
                required: true,
                default: "light",
                attributes: { options: [{ name: "light", label: "Light" }, { name: "dark", label: "Dark" }] },
              },
              {
                name: "layout_style",
                label: "Navigation layout",
                type: "String",
                required: true,
                default: "Horizontal",
                attributes: { inline: true, options: ["Horizontal", "Vertical"] },
              },
              {
                name: "font_family",
                label: "Font family",
                type: "String",
                required: true,
                default: "inter",
                attributes: {
                  options: [
                    { name: "inter",        label: "Inter (clean & modern)" },
                    { name: "outfit",       label: "Outfit (friendly)" },
                    { name: "plus_jakarta", label: "Plus Jakarta Sans (elegant)" },
                    { name: "system",       label: "System UI (native)" },
                  ],
                },
              },
              {
                name: "border_radius_style",
                label: "Corner style",
                type: "String",
                required: true,
                default: "regular",
                attributes: {
                  options: [
                    { name: "sharp",   label: "Sharp (0px)" },
                    { name: "regular", label: "Regular (recommended)" },
                    { name: "rounded", label: "Rounded (friendly)" },
                  ],
                },
              },
              {
                name: "colorscheme",
                label: "Navbar color scheme",
                type: "String",
                required: true,
                default: "",
                attributes: {
                  options: [
                    { name: "",                    label: "Glass (auto)" },
                    { name: "navbar-dark bg-dark", label: "Dark" },
                    { name: "navbar-dark bg-primary", label: "Primary" },
                    { name: "navbar-light bg-light", label: "Light" },
                    { name: "navbar-light bg-white", label: "White" },
                    { name: "transparent-dark",    label: "Transparent Dark" },
                  ],
                },
                showIf: { layout_style: "Horizontal" },
              },
              {
                name: "colorscheme",
                label: "Sidebar color scheme",
                type: "String",
                required: true,
                default: "",
                attributes: {
                  options: [
                    { name: "",                      label: "Auto (follows mode)" },
                    { name: "sidenav-dark bg-dark",  label: "Dark" },
                    { name: "sidenav-dark bg-primary", label: "Primary" },
                    { name: "sidenav-light bg-light", label: "Light" },
                    { name: "sidenav-light bg-white", label: "White" },
                  ],
                },
                showIf: { layout_style: "Vertical" },
              },
              {
                name: "fixedTop",
                label: "Fixed top navbar",
                type: "Bool",
                showIf: { layout_style: "Horizontal" },
              },
              {
                name: "sidebar_icon_only",
                label: "Icon-only sidebar (hide labels)",
                type: "Bool",
                showIf: { layout_style: "Vertical" },
              },
              {
                name: "sidebar_hover_expand",
                label: "Expand sidebar on hover",
                type: "Bool",
                showIf: { sidebar_icon_only: true },
              },
              {
                name: "fluid",
                label: "Fluid (full-width) container",
                type: "Bool",
              },
              {
                name: "in_card",
                label: "Wrap content in card",
                type: "Bool",
              },
              {
                name: "use_gradient",
                label: "Gradient mode (buttons & accents)",
                type: "Bool",
              },
              {
                name: "toppad",
                label: "Top padding (0–5)",
                sublabel: "Adjust if content overlaps the navbar",
                type: "Integer",
                required: true,
                default: 2,
                attributes: { min: 0, max: 5 },
              },
              {
                name: "hide_site_name",
                label: "Hide site name in navbar",
                type: "Bool",
              },
              {
                name: "brand_gradient",
                label: "Gradient site name",
                sublabel: "Apply a gradient effect to the site name in the navbar and sidebar",
                type: "Bool",
              },
              {
                name: "primary_color_light",
                label: "Primary color (Light mode)",
                type: "Color",
                default: "#6366f1",
              },
              {
                name: "secondary_color_light",
                label: "Secondary / accent color (Light mode)",
                type: "Color",
                default: "#8b5cf6",
              },
              {
                name: "primary_color_dark",
                label: "Primary color (Dark mode)",
                type: "Color",
                default: "#818cf8",
              },
              {
                name: "secondary_color_dark",
                label: "Secondary / accent color (Dark mode)",
                type: "Color",
                default: "#a78bfa",
              },
              {
                name: "bg_color_light",
                label: "Page background (Light)",
                type: "Color",
                default: "#f8f9fa",
              },
              {
                name: "bg_color_dark",
                label: "Page background (Dark)",
                type: "Color",
                default: "#0f1117",
              },
              {
                name: "surface_color_light",
                label: "Card surface (Light)",
                type: "Color",
                default: "#ffffff",
              },
              {
                name: "surface_color_dark",
                label: "Card surface (Dark)",
                type: "Color",
                default: "#1a1d27",
              },
            ],
          }),
      },
    ],
  });

// ── Module export ─────────────────────────────────────────────────────────────
module.exports = {
  sc_plugin_api_version: 1,
  layout,
  configuration_workflow,
  user_config_form,
  plugin_name: "aurora-design",

  actions: () => ({
    toggle_aurora_dark_mode: {
      description: "Toggle between Aurora dark and light mode",
      configFields: [],
      run: async ({ user, req }) => {
        let plugin = await Plugin.findOne({ name: "aurora-design" });
        if (!plugin) plugin = await Plugin.findOne({ name: "@saltcorn/aurora-design" });
        if (!plugin) return;
        const dbUser = await User.findOne({ id: user.id });
        const attrs = dbUser._attributes || {};
        const userLayout = attrs.layout || { config: {} };
        userLayout.plugin = plugin.name;
        const currentMode = userLayout.config.mode
          ? userLayout.config.mode
          : plugin.configuration?.mode
          ? plugin.configuration.mode
          : "light";
        userLayout.config.mode = currentMode === "dark" ? "light" : "dark";
        userLayout.config.is_user_config = true;
        attrs.layout = userLayout;
        await dbUser.update({ _attributes: attrs });
        await db.commitAndBeginNewTransaction?.();
        await getState().refreshUserLayouts?.();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await dbUser.relogin(req);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { reload_page: true };
      },
    },
  }),
};
