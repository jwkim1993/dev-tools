(() => {
  'use strict';

  const NAV_LINKS = [
    { href: '/', label: 'Tools' },
    { href: '/json-prettier/', label: 'JSON Formatter' },
    { href: '/uuid-generator/', label: 'UUID Generator' },
    { href: '/jwt-decoder/', label: 'JWT Decoder' },
    { href: '/about.html', label: 'About' },
  ];

  const navLinks = document.getElementById('navLinks');
  const toggle = document.getElementById('navToggle');

  if (navLinks) {
    const path = location.pathname;
    navLinks.innerHTML = NAV_LINKS.map(link => {
      const active = link.href === '/'
        ? path === '/' || path === '/index.html'
        : path.startsWith(link.href);
      const cls = 'nav__link' + (active ? ' nav__link--active' : '');
      return '<li><a href="' + link.href + '" class="' + cls + '">' + link.label + '</a></li>';
    }).join('');
  }

  if (!toggle || !navLinks) return;
  toggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('nav__links--open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
