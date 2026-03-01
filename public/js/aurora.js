/* ================================================================
   AURORA DESIGN — Client-side enhancements
   ================================================================ */
(function () {
  'use strict';

  const cfg = window.__auroraConfig || {};

  /* ── Util ──────────────────────────────────────────────────────── */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ── Loading progress bar ──────────────────────────────────────── */
  const loader = document.getElementById('au-loader');
  let loaderWidth = 0;
  let loaderTimer = null;

  function loaderStart() {
    if (!loader) return;
    loaderWidth = 8;
    loader.style.width = loaderWidth + '%';
    loader.style.opacity = '1';
    loader.classList.add('au-loader--active');
    clearInterval(loaderTimer);
    loaderTimer = setInterval(() => {
      if (loaderWidth < 82) {
        loaderWidth += (82 - loaderWidth) * 0.12;
        loader.style.width = Math.min(loaderWidth, 82) + '%';
      }
    }, 100);
  }

  function loaderFinish() {
    if (!loader) return;
    clearInterval(loaderTimer);
    loader.style.width = '100%';
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.width = '0%';
        loaderWidth = 0;
      }, 350);
    }, 220);
  }

  // Start on load
  loaderStart();
  if (document.readyState === 'complete') {
    loaderFinish();
  } else {
    window.addEventListener('load', loaderFinish, { once: true });
  }

  // Intercept navigation clicks to show loading bar
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (
      link &&
      link.href &&
      !link.href.startsWith('#') &&
      !link.target &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey &&
      link.protocol !== 'javascript:' &&
      link.hostname === window.location.hostname
    ) {
      loaderStart();
    }
  });

  // Also trigger on form submit
  document.addEventListener('submit', function (e) {
    if (e.target.tagName === 'FORM' && e.target.method !== 'dialog') {
      loaderStart();
    }
  });

  /* ── Page content entrance animation ──────────────────────────── */
  const pageInner = document.getElementById('page-inner-content');
  if (pageInner) {
    pageInner.classList.add('au-page-enter');
    pageInner.addEventListener('animationend', () => {
      pageInner.classList.remove('au-page-enter');
    }, { once: true });
  }

  /* ── Navbar scroll effect ──────────────────────────────────────── */
  const navbar = $('.au-navbar') || $('.au-mobile-bar');
  if (navbar) {
    const onNavScroll = () => {
      if (window.scrollY > 12) {
        navbar.classList.add('au-navbar--scrolled');
      } else {
        navbar.classList.remove('au-navbar--scrolled');
      }
    };
    window.addEventListener('scroll', onNavScroll, { passive: true });
    onNavScroll();
  }

  /* ── Card entrance animations (IntersectionObserver) ──────────── */
  if ('IntersectionObserver' in window && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const cardObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            entry.target.addEventListener('transitionend', () => {
              entry.target.style.transform = '';
            }, { once: true });
            cardObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    $$('.card, .list-group-item').forEach((el) => {
      // Only animate elements not already in view initially
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.9) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)';
        cardObs.observe(el);
      }
    });
  }

  /* ── Button ripple effect ──────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .btn-outline-primary, .au-sidebar-link');
    if (!btn) return;

    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'au-ripple';
    ripple.style.cssText =
      `width:${size}px;height:${size}px;top:${y}px;left:${x}px;` +
      'position:absolute;border-radius:50%;background:rgba(255,255,255,0.28);' +
      'transform:scale(0);animation:au-ripple-anim 0.55s linear;pointer-events:none;';

    btn.style.position  = btn.style.position || 'relative';
    btn.style.overflow  = 'hidden';
    btn.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  /* ── Dropdown hover for nested menus ───────────────────────────── */
  $$('.au-hover-dropdown-item').forEach((item) => {
    let timer;
    const menu   = item.querySelector('.dropdown-menu');
    const toggle = item.querySelector('[data-bs-toggle="dropdown"]');
    if (!menu || !toggle) return;

    const show = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const bsDD = window.bootstrap && window.bootstrap.Dropdown
          ? (window.bootstrap.Dropdown.getInstance(toggle) || new window.bootstrap.Dropdown(toggle))
          : null;
        if (bsDD) bsDD.show();
      }, 80);
    };
    const hide = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const bsDD = window.bootstrap && window.bootstrap.Dropdown
          ? window.bootstrap.Dropdown.getInstance(toggle)
          : null;
        if (bsDD) bsDD.hide();
      }, 180);
    };

    item.addEventListener('mouseenter', show);
    item.addEventListener('mouseleave', hide);
    menu.addEventListener('mouseenter', () => clearTimeout(timer));
    menu.addEventListener('mouseleave', hide);
  });

  /* ── Bootstrap tooltips init ───────────────────────────────────── */
  $$('[data-bs-toggle="tooltip"]').forEach((el) => {
    if (window.bootstrap && window.bootstrap.Tooltip) {
      new window.bootstrap.Tooltip(el, { trigger: 'hover focus' });
    }
  });

  /* ── Bootstrap popovers init ────────────────────────────────────── */
  $$('[data-bs-toggle="popover"]').forEach((el) => {
    if (window.bootstrap && window.bootstrap.Popover) {
      new window.bootstrap.Popover(el);
    }
  });

  /* ── Auto-close mobile offcanvas on nav-link click ─────────────── */
  const offcanvas = document.getElementById('au-sidebar-mobile');
  if (offcanvas && window.bootstrap) {
    offcanvas.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]:not([data-bs-toggle])');
      if (link) {
        const bsOC = window.bootstrap.Offcanvas
          ? window.bootstrap.Offcanvas.getInstance(offcanvas)
          : null;
        if (bsOC) bsOC.hide();
      }
    });
  }

  /* ── Dark mode toggle helper ────────────────────────────────────── */
  // Persist per-user preference to localStorage and <html data-bs-theme>
  const DARK_KEY = 'aurora_dark_mode';

  function applyDarkPref() {
    const stored = localStorage.getItem(DARK_KEY);
    if (stored) {
      document.documentElement.setAttribute('data-bs-theme', stored);
    }
  }
  applyDarkPref();

  // Expose global toggle function for Saltcorn buttons
  window.auroraToggleDark = function () {
    const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem(DARK_KEY, next);
    // Also post to server action if available
    const csrf = document.querySelector('input[name="_csrf"]');
    if (csrf) {
      fetch('/api/action/toggle_aurora_dark_mode', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ _csrf: csrf.value }),
      }).catch(() => {});
    }
  };

  /* ── Scroll progress bar (if enabled) ──────────────────────────── */
  const scrollBar = document.getElementById('au-scroll-progress');
  if (scrollBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* ── Smooth active sidebar highlight on scroll ─────────────────── */
  // Highlight sidebar link matching the current URL on load
  const currentPath = window.location.pathname + window.location.search;
  $$('.au-sidebar-link[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && currentPath.startsWith(href) && href !== '/') {
      link.classList.add('active');
      // Expand parent collapse if any
      const collapse = link.closest('.collapse');
      if (collapse) {
        collapse.classList.add('show');
        const trigger = document.querySelector(`[data-bs-target="#${collapse.id}"]`);
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
      }
    }
  });

  /* ── Stagger list animations ────────────────────────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    $$('.au-sidebar-nav .nav-item').forEach((item, ix) => {
      item.style.animationDelay = `${ix * 28}ms`;
    });
  }

  /* ── Table: add row count to empty tables ──────────────────────── */
  $$('table.table').forEach((table) => {
    const tbody = table.querySelector('tbody');
    if (tbody && tbody.children.length === 0) {
      const cols = (table.querySelector('thead tr')?.cells.length) || 1;
      const row  = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan  = cols;
      cell.className = 'text-center text-muted py-4';
      cell.textContent = 'No data';
    }
  });

  /* ── Form: float-label effect for inputs ───────────────────────── */
  // already handled natively by Bootstrap's floating labels

  /* ── Collapse animation smooth height ──────────────────────────── */
  $$('.collapse').forEach((el) => {
    el.addEventListener('show.bs.collapse', function () {
      el.style.display = 'block';
    });
  });

})();
